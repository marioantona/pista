<?php

// Starting the session
require_once __DIR__ . '/session.php';

// Connecting to the database
include("configure.php");
require_once __DIR__ . '/client_ip.php';
require_once __DIR__ . '/rate_limit.php';
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json');

// Rate limiting -- RUNBOOK §17. Only FAILED logins count, so a real user who
// signs in often is never locked out, while every guess an attacker makes does
// count. Unknown addresses count exactly like registered ones, so a lockout says
// nothing about whether an account exists.
//
// This limiter FAILS OPEN. If it cannot use its table, the login goes ahead and
// the failure is logged loudly: a database blip must not lock every user out.
// (forgot_password.php makes the opposite choice, to protect the Brevo allowance.)
const PISTA_LOGIN_WINDOW = 900;          // 15 minutes
const PISTA_LOGIN_LIMIT_IP = 10;
const PISTA_LOGIN_LIMIT_EMAIL = 5;

// Every failed login ends here: count it against both buckets, then return the
// single failure message. The count is best-effort -- see "fails open" above.
function pista_login_fail(mysqli $conn, string $ipBucket, string $emailBucket): void
{
    try {
        pista_rate_hit($conn, $ipBucket, PISTA_LOGIN_WINDOW);
        pista_rate_hit($conn, $emailBucket, PISTA_LOGIN_WINDOW);
    } catch (\Throwable $e) {
        error_log("LOGIN RATE LIMITER FAILED to record a failure (failing open): " . $e->getMessage());
    }

    // Same message whether the address exists or not, deliberately. Distinct
    // messages let anyone enumerate which addresses hold accounts by reading the
    // response. A timing side channel remains -- the no-user path skips
    // password_verify() entirely -- logged in docs/RUNBOOK.md section 15.
    echo json_encode(["success" => false, "error" => "Invalid email or password"]);
    exit();
}

// A real bcrypt hash of a value nobody can present, verified on the paths that
// have no hash of their own. Without it the no-such-user and OAuth-only paths
// answer measurably faster than a wrong password, which tells an attacker which
// addresses hold password accounts -- the timing channel logged in RUNBOOK §15.
// 🔴 Generate this ON THE SERVER: password_hash() uses PASSWORD_DEFAULT's cost,
// which differs per machine. The first version of this constant was made on a dev
// laptop at cost 12 while the server hashes at cost 10, so the "equalising" path
// took ~478 ms against a real verify's ~107 ms -- a bigger timing signal than the
// one it was meant to remove, pointing the other way. Regenerate with:
//   ssh pista 'php -r "echo password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT);"'
const PISTA_DUMMY_HASH = '$2y$10$mYYOwUV0LzcljUXJ9zsyoe5Q3AFlLI/T6Q4XEXw7BtfQEk642mvJ.';

// Costs one bcrypt verification and returns nothing. The return value is
// deliberately ignored: this exists to spend the time, not to decide anything.
function pista_equalise_login_timing(string $password): void
{
    // Costs nothing (no hashing): password_needs_rehash only inspects the header.
    // If PHP's default cost ever moves, this says so in the log instead of leaving
    // the equalisation quietly lopsided.
    if (password_needs_rehash(PISTA_DUMMY_HASH, PASSWORD_DEFAULT)) {
        error_log('PISTA_DUMMY_HASH no longer matches PASSWORD_DEFAULT: login timing equalisation is off');
    }

    password_verify($password, PISTA_DUMMY_HASH);
}

// Using POST to login to the account 
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = trim($_POST["email"] ?? '');
    $password = $_POST["password"] ?? '';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "error" => "Invalid email format"]);
        exit();
    }

    $rl_ip    = 'login:ip:' . pista_client_ip();
    $rl_email = 'login:email:' . pista_rate_email_key($email);

    // Checked BEFORE the password, so a correct password during a lockout is
    // refused too -- otherwise the lockout would still let an attacker test guesses.
    try {
        $throttled = pista_rate_limited($conn, $rl_ip, PISTA_LOGIN_LIMIT_IP, PISTA_LOGIN_WINDOW)
                  || pista_rate_limited($conn, $rl_email, PISTA_LOGIN_LIMIT_EMAIL, PISTA_LOGIN_WINDOW);
    } catch (\Throwable $e) {
        error_log("LOGIN RATE LIMITER FAILED to check (failing open): " . $e->getMessage());
        $throttled = false;
    }

    if ($throttled) {
        error_log("Login throttled: client " . pista_client_ip());
        http_response_code(429);
        echo json_encode(["success" => false, "error" => "Too many sign-in attempts. Please wait 15 minutes and try again."]);
        exit();
    }

    // Using a select statement to get information from the database
    $stmt = $conn->prepare("SELECT user_id, password FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows>0) {
        $stmt->bind_result($user_id, $hashed_password);
        $stmt->fetch();

        // OAuth-only accounts have password IS NULL. password_verify() with a null
        // hash raises a PHP 8.1+ deprecation, so check the type first; the attempt
        // then fails like any other wrong password, and is counted like one.
        if (!is_string($hashed_password) || $hashed_password === '') {
            // OAuth-only account: no hash to check, so spend the same time anyway.
            pista_equalise_login_timing($password);
            pista_login_fail($conn, $rl_ip, $rl_email);
        }

        if (password_verify($password, $hashed_password)) {

            // A successful login clears this address's failure count. The IP bucket
            // is left alone, so one valid account cannot reset a sprayer's budget.
            try {
                pista_rate_clear($conn, $rl_email);
            } catch (\Throwable $e) {
                error_log("Login rate limiter failed to clear a bucket: " . $e->getMessage());
            }

            // Session fixation defence: issue a brand-new session ID at the
            // exact moment privilege changes. 'true' deletes the old session
            // file, so any ID an attacker planted before login is dead rather
            // than merely orphaned.
            session_regenerate_id(true);

            //echo ("Successful login");
            // Records WHEN this session authenticated, which is what a password
            // reset later invalidates against (auth.php, Phase 0C).
            pista_mark_authenticated($user_id);
            // Displaying the name 
            $namestmt = $conn->prepare("SELECT fullname FROM users WHERE user_id = ?");
            $namestmt->bind_param("i", $user_id);
            $namestmt->execute();
            $namestmt->bind_result($fullname);
            $namestmt->fetch();
            $namestmt->close();

            $pref_stmt = $conn->prepare("SELECT region, unit, currency FROM preferences WHERE user_id = ?");
            $pref_stmt->bind_param("i", $user_id);
            $pref_stmt->execute();
            $pref_result = $pref_stmt->get_result();

            //def. to UK/GBP if user has no preferences yet
            $region = "uk";
            $currency = "gbp";

            if ($pref_row = $pref_result->fetch_assoc()) {
                $region = $pref_row["region"];
                $currency = $pref_row["currency"];
            };
            $pref_stmt->close();

            //fetch lang. preferences from details 
            $lang_stmt = $conn->prepare("SELECT lang FROM details WHERE user_id = ?");
            $lang_stmt->bind_param("i", $user_id);
            $lang_stmt->execute();
            $lang_result = $lang_stmt->get_result();

            $lang = ""; //leave blank if no details exist (JS will fallback to browser lang.)
            if ($lang_row = $lang_result->fetch_assoc()) {
                $lang = $lang_row["lang"];
            }
            $lang_stmt->close();

            // "Remember me" now means it: a database-backed token re-establishes
            // the session after the browser closes. Before Phase 0C it only
            // stretched the convenience cookies, so a returning visitor was
            // greeted by name and then treated as a guest.
            if (isset($_POST["remember"])) {
                pista_issue_remember_token($conn, $user_id);
            }

            // Calculate cookie expiration based on "Remember Me" - if true valid for 30 days otherwise 1 day
            $cookie_time = isset($_POST["remember"]) ? time() + (86400 * 30) : time() + (86400 * 1);

            pista_set_client_cookie("user_id", $user_id, $cookie_time);
            pista_set_client_cookie("fullName", $fullname, $cookie_time);
            pista_set_client_cookie("region", $region, $cookie_time);
            pista_set_client_cookie("currency", $currency, $cookie_time);

            //set new lang cookie if it exists in the db
            if (!empty($lang)) {
                pista_set_client_cookie("lang", $lang, $cookie_time);
            }

            echo json_encode(["success" => true]);
            exit();
        }
        else {
            pista_login_fail($conn, $rl_ip, $rl_email);
        }
    }
    else {
        // No such address. Spend a bcrypt verification anyway, so this path cannot
        // be told from a wrong password by how fast it answers.
        pista_equalise_login_timing($password);
        pista_login_fail($conn, $rl_ip, $rl_email);
    }

    $stmt->close();
    $conn->close();
}
?>