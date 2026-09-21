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
        if (is_string($hashed_password) && password_verify($password, $hashed_password)) {

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
        pista_login_fail($conn, $rl_ip, $rl_email);
    }

    $stmt->close();
    $conn->close();
}
?>