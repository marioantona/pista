<?php
// Who is this request? — Phase 0C.
//
// Until now every endpoint answered that question for itself with
// `isset($_SESSION['user_id'])`, in seventeen places. Two things were therefore
// impossible to state truthfully:
//
//   1. "Resetting your password logs you out everywhere." PHP's sessions are
//      files this code cannot enumerate, so revocation has to be a check on the
//      way IN: every session records when it was authenticated, and a reset marks
//      the account with a timestamp that older sessions fail against.
//   2. "Remember me." The old checkbox only extended the convenience cookies, so
//      a returning visitor was greeted by name and treated as a guest. Simply
//      lengthening PHPSESSID would not work either: PHP's garbage collector drops
//      idle session FILES after session.gc_maxlifetime (1440s by default), so the
//      cookie would outlive the session unpredictably. A remember token lives in
//      the database and re-establishes the session instead.
//
// The invariant hook enforces that `$_SESSION['user_id']` is read only here and
// in the three files that write it. Everything else calls pista_current_user().

require_once __DIR__ . '/session.php';

if (!function_exists('pista_current_user')) {

    // -----------------------------------------------------------------------
    // The one answer. Returns a user_id, or null for "not logged in".
    //
    // Order matters: a live session is checked first (cheap, and the common
    // case), and only then is a remember cookie consulted.
    // -----------------------------------------------------------------------
    function pista_current_user(mysqli $conn): ?int
    {
        if (isset($_SESSION['user_id'])) {
            $user_id = (int) $_SESSION['user_id'];
            // A session with no auth_at predates Phase 0C. Treat it as authenticated
            // at epoch, so a reset invalidates it like any other.
            $auth_at = isset($_SESSION['auth_at']) ? (int) $_SESSION['auth_at'] : 0;

            $stmt = $conn->prepare("SELECT UNIX_TIMESTAMP(sessions_valid_after) AS valid_after FROM users WHERE user_id = ?");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $row = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            if (!$row) {
                // The account is gone; the session is meaningless.
                pista_destroy_session();
                return null;
            }

            $valid_after = $row['valid_after'] === null ? null : (int) $row['valid_after'];
            if ($valid_after !== null && $auth_at < $valid_after) {
                // Revoked: a password reset happened after this session began.
                pista_destroy_session();
                pista_clear_remember_cookie();
                return null;
            }

            // A session the user did not ask to be remembered dies on idleness,
            // because the browser cannot be trusted to end it: Chrome and Firefox
            // restore session cookies across a restart, which made an unticked
            // login look like a remembered one. A remembered session needs no
            // timeout -- its token re-establishes it, re-checking revocation.
            $remembered = !empty($_SESSION['remembered']);
            $seen_at = isset($_SESSION['seen_at']) ? (int) $_SESSION['seen_at'] : $auth_at;
            if (!$remembered && (time() - $seen_at) > PISTA_SESSION_IDLE_SECONDS) {
                pista_destroy_session();
                return null;
            }
            $_SESSION['seen_at'] = time();

            return $user_id;
        }

        return pista_resume_from_remember_token($conn);
    }

    // -----------------------------------------------------------------------
    // Issue a remember token, and hand its cookie to the browser.
    //
    // Two halves: the SELECTOR identifies the row, the VALIDATOR proves the
    // holder is legitimate. Only a hash of the validator is stored, so a leaked
    // database is not a pile of usable cookies. Lookup by selector also means the
    // query never has to compare secrets, which is what keeps the comparison a
    // constant-time hash_equals() on exactly one candidate row.
    // -----------------------------------------------------------------------
    function pista_issue_remember_token(mysqli $conn, int $user_id): void
    {
        $selector  = bin2hex(random_bytes(12)); // 24 chars, matches CHAR(24)
        $validator = bin2hex(random_bytes(32));
        $expires   = time() + (86400 * PISTA_REMEMBER_DAYS);

        $hash = hash('sha256', $validator);
        $expires_sql = date('Y-m-d H:i:s', $expires);

        $stmt = $conn->prepare("INSERT INTO remember_tokens (selector, user_id, validator_hash, expires_at) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("siss", $selector, $user_id, $hash, $expires_sql);
        $stmt->execute();
        $stmt->close();

        // Expired rows are cleared opportunistically, as rate_limit.php does, so
        // there is no new cron job to forget about.
        $conn->query("DELETE FROM remember_tokens WHERE expires_at < NOW()");

        pista_set_remember_cookie($selector . ':' . $validator, $expires);
    }

    // -----------------------------------------------------------------------
    // Resume a session from the cookie.
    //
    // The SELECTOR is stable for the life of the token and only the VALIDATOR
    // rotates. That asymmetry is the whole point: a copied cookie eventually
    // presents an old validator against a selector that still exists, which a
    // legitimate holder never does. (Deleting the row and issuing a fresh pair
    // instead -- my first attempt -- made a replay indistinguishable from any
    // stale cookie, so the theft branch was unreachable.)
    //
    // The grace window exists because this frontend fires several endpoints at
    // once on page load. Without it, the second concurrent request would present
    // the validator the first had just rotated away and be branded a thief.
    // -----------------------------------------------------------------------
    function pista_resume_from_remember_token(mysqli $conn): ?int
    {
        $cookie = $_COOKIE[PISTA_REMEMBER_COOKIE] ?? '';
        if (!is_string($cookie) || substr_count($cookie, ':') !== 1) {
            return null;
        }

        [$selector, $validator] = explode(':', $cookie, 2);
        if (!preg_match('/^[0-9a-f]{24}$/', $selector) || !preg_match('/^[0-9a-f]{64}$/', $validator)) {
            pista_clear_remember_cookie();
            return null;
        }

        $stmt = $conn->prepare("SELECT user_id, validator_hash, previous_validator_hash, expires_at,
                                       UNIX_TIMESTAMP(created_at) AS created_ts,
                                       UNIX_TIMESTAMP(rotated_at) AS rotated_ts
                                FROM remember_tokens WHERE selector = ?");
        $stmt->bind_param("s", $selector);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$row) {
            // Unknown selector: an expired, revoked or simply stale cookie. Not
            // evidence of anything, so it is cleared quietly.
            pista_clear_remember_cookie();
            return null;
        }

        $user_id   = (int) $row['user_id'];
        $presented = hash('sha256', $validator);
        $now       = time();
        $rotated_ts = $row['rotated_ts'] === null ? null : (int) $row['rotated_ts'];

        if (hash_equals($row['validator_hash'], $presented)) {
            $state = 'current';
        } elseif ($row['previous_validator_hash'] !== null
            && hash_equals($row['previous_validator_hash'], $presented)
            && $rotated_ts !== null && ($now - $rotated_ts) <= PISTA_REMEMBER_GRACE_SECONDS) {
            // A request that was already in flight when another rotated the token.
            $state = 'grace';
        } else {
            // Neither the current validator nor a recently retired one: the cookie
            // was copied and is being used after the real holder moved on. Revoke
            // every token for the account -- the standard response.
            error_log('Remember token reuse detected; revoking all tokens for user ' . $user_id);
            pista_revoke_all_remember_tokens($conn, $user_id);
            pista_clear_remember_cookie();
            return null;
        }

        if (strtotime($row['expires_at']) <= $now) {
            pista_delete_remember_selector($conn, $selector);
            pista_clear_remember_cookie();
            return null;
        }

        // A reset may have happened while this browser was closed. Resetting
        // revokes tokens outright, so this should never fire -- it is the belt to
        // that braces, and it also covers an account deleted in the meantime.
        $check = $conn->prepare("SELECT UNIX_TIMESTAMP(sessions_valid_after) AS valid_after FROM users WHERE user_id = ?");
        $check->bind_param("i", $user_id);
        $check->execute();
        $user = $check->get_result()->fetch_assoc();
        $check->close();

        $valid_after = $user && $user['valid_after'] !== null ? (int) $user['valid_after'] : null;
        if (!$user || ($valid_after !== null && (int) $row['created_ts'] < $valid_after)) {
            pista_delete_remember_selector($conn, $selector);
            pista_clear_remember_cookie();
            return null;
        }

        // A new session ID: resuming is a privilege change like any other login,
        // so the same fixation defence applies.
        session_regenerate_id(true);
        pista_mark_authenticated($user_id, true);

        // Rotate at most once per window, and never on a grace-window request --
        // that browser already holds the newer cookie.
        $due = $rotated_ts === null || ($now - $rotated_ts) >= PISTA_REMEMBER_ROTATE_SECONDS;
        if ($state === 'current' && $due) {
            $fresh   = bin2hex(random_bytes(32));
            $expires = $now + (86400 * PISTA_REMEMBER_DAYS);
            $hash    = hash('sha256', $fresh);
            $expires_sql = date('Y-m-d H:i:s', $expires);

            $rot = $conn->prepare("UPDATE remember_tokens
                                      SET previous_validator_hash = validator_hash,
                                          validator_hash = ?,
                                          rotated_at = NOW(),
                                          last_used_at = NOW(),
                                          expires_at = ?
                                    WHERE selector = ?");
            $rot->bind_param("sss", $hash, $expires_sql, $selector);
            $rot->execute();
            $rot->close();

            pista_set_remember_cookie($selector . ':' . $fresh, $expires);
        } else {
            $touch = $conn->prepare("UPDATE remember_tokens SET last_used_at = NOW() WHERE selector = ?");
            $touch->bind_param("s", $selector);
            $touch->execute();
            $touch->close();
        }

        return $user_id;
    }

    // -----------------------------------------------------------------------
    // Revocation.
    // -----------------------------------------------------------------------
    function pista_delete_remember_selector(mysqli $conn, string $selector): void
    {
        $stmt = $conn->prepare("DELETE FROM remember_tokens WHERE selector = ?");
        $stmt->bind_param("s", $selector);
        $stmt->execute();
        $stmt->close();
    }

    // This device only: used by logout, which should not sign the user out of
    // their other browsers.
    function pista_revoke_remember_token(mysqli $conn): void
    {
        $cookie = $_COOKIE[PISTA_REMEMBER_COOKIE] ?? '';
        if (is_string($cookie) && substr_count($cookie, ':') === 1) {
            [$selector] = explode(':', $cookie, 2);
            if (preg_match('/^[0-9a-f]{24}$/', $selector)) {
                pista_delete_remember_selector($conn, $selector);
            }
        }
        pista_clear_remember_cookie();
    }

    // Everywhere: used by a password reset and by theft detection.
    function pista_revoke_all_remember_tokens(mysqli $conn, int $user_id): void
    {
        $stmt = $conn->prepare("DELETE FROM remember_tokens WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $stmt->close();
    }

    // -----------------------------------------------------------------------
    // Record an authentication. Called by login.php, signup.php and
    // oauth_callback.php, next to their session_regenerate_id(true).
    // -----------------------------------------------------------------------
    // $remembered: the user ticked the box, or arrived through a provider (which
    // issues a token of its own). It decides whether the session may sit idle.
    function pista_mark_authenticated(int $user_id, bool $remembered = false): void
    {
        $_SESSION['user_id'] = $user_id;
        $_SESSION['auth_at'] = time();
        $_SESSION['seen_at'] = time();
        $_SESSION['remembered'] = $remembered;
    }
}
?>
