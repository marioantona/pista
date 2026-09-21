<?php
require_once __DIR__ . '/session.php';

// Connecting to the database
include("configure.php");
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/client_ip.php';
require_once __DIR__ . '/rate_limit.php';

header('Content-Type: application/json');

// Bcrypt hashes at most the first 72 BYTES of a password and silently ignores the
// rest, so two different long passphrases sharing a 72-byte prefix would be the same
// credential. Reject rather than truncate. strlen(), not mb_strlen() -- the limit is
// bytes, and a multibyte passphrase hits it sooner than its character count suggests.
const PISTA_PASSWORD_MIN = 8;
const PISTA_PASSWORD_MAX_BYTES = 72;

// Column widths from deploy/schema.sql. Under PHP 8.1+ mysqli error reporting an
// over-length value throws errno 1406 rather than truncating, so these guards turn a
// 500 into a readable message.
const PISTA_FULLNAME_MAX = 100;
const PISTA_EMAIL_MAX = 255;

// Signup deliberately reveals whether an address is already registered (RUNBOOK
// §17's register: unavoidable without verify-before-create), which left it the
// one unthrottled way to test addresses in bulk. Item 5 rate-limited login and
// password reset but not this. Per IP only: an email bucket here would itself
// confirm which addresses had been tried.
const PISTA_SIGNUP_WINDOW = 3600;   // 1 hour
const PISTA_SIGNUP_LIMIT_IP = 10;

// The monthly allowance a new account starts with -- the same number
// reset_quotas.php restores, and the schema default for users.credits_remaining.
const PISTA_DEFAULT_CREDITS = 10;
// What a signup gets when this IP has already left several tombstones this period:
// the guest allowance, not nothing, because the address may genuinely be shared.
const PISTA_GUEST_CREDITS = 2;
const PISTA_TOMBSTONE_IP_LIMIT = 3;

function pista_signup_fail(string $message): void {
    echo json_encode(["success" => false, "error" => $message]);
    exit();
}

// Using POST to create an account
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    pista_signup_fail("Method not allowed.");
}

// Throttle before any lookup, so a throttled request cannot be used to probe an
// address either. Fails OPEN like login.php, not closed like forgot_password.php:
// a database blip must not stop people signing up, and unlike password reset
// there is no finite email allowance to protect.
$rl_signup_ip = 'signup:ip:' . pista_client_ip();
try {
    if (pista_rate_limited($conn, $rl_signup_ip, PISTA_SIGNUP_LIMIT_IP, PISTA_SIGNUP_WINDOW)) {
        error_log("Signup throttled: client " . pista_client_ip());
        http_response_code(429);
        pista_signup_fail("Too many sign-up attempts from this network. Please try again later.");
    }
    pista_rate_hit($conn, $rl_signup_ip, PISTA_SIGNUP_WINDOW);
} catch (\Throwable $e) {
    error_log("SIGNUP RATE LIMITER FAILED (failing open): " . $e->getMessage());
}

$fullname = trim($_POST["fullname"] ?? '');
$email = trim($_POST["email"] ?? '');     //trim to remove accidental spaces
$password = $_POST["password"] ?? '';
$confirm_password = $_POST["confirm_password"] ?? '';

if ($fullname === '') {
    pista_signup_fail("Please enter your full name");
}

if (mb_strlen($fullname) > PISTA_FULLNAME_MAX) {
    pista_signup_fail("Name must be " . PISTA_FULLNAME_MAX . " characters or fewer");
}

//server-side email validation
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    pista_signup_fail("Invalid email format");
}

if (strlen($email) > PISTA_EMAIL_MAX) {
    pista_signup_fail("Email address is too long");
}

// Checking that the two passwords entered match
if ($password !== $confirm_password) {
    pista_signup_fail("Passwords do not match");
}

if (mb_strlen($password) < PISTA_PASSWORD_MIN) {
    pista_signup_fail("Password must be at least " . PISTA_PASSWORD_MIN . " characters");
}

if (strlen($password) > PISTA_PASSWORD_MAX_BYTES) {
    pista_signup_fail("Password must be " . PISTA_PASSWORD_MAX_BYTES . " bytes or fewer");
}

// Signup telling the visitor that an address is already registered is a CONSCIOUS
// decision (docs/RUNBOOK.md section 17), not an oversight: it is unavoidable without
// verify-before-create, which is out of scope. Password reset is the flow where it IS
// avoidable, and forgot_password.php stays generic for exactly that reason.
$duplicate_message = "An account with this email already exists. Try signing in instead.";

// Pre-check for the MESSAGE only. It loses the race against a concurrent signup, which
// is precisely why the errno 1062 handler below is not redundant -- the UNIQUE index on
// users.email is the authority, this query is just courtesy.
$check = $conn->prepare("SELECT user_id FROM users WHERE email = ?");
$check->bind_param("s", $email);
$check->execute();
$check->store_result();
$already_exists = $check->num_rows > 0;
$check->close();

if ($already_exists) {
    pista_signup_fail($duplicate_message);
}

// Creating a password hash
$hashed_password = password_hash($password, PASSWORD_DEFAULT);

// Preventing SQL injections by using placeholders
// What this account starts with. Normally the schema default (10), but deleting an
// account and signing up again must not refill the quota, so a tombstone from THIS
// period hands back only what was left (Phase 0C).
$starting_credits = PISTA_DEFAULT_CREDITS;
$signup_period = date('Y-m');
$signup_email_hash = hash('sha256', strtolower($email));
$signup_ip_hash = hash('sha256', pista_client_ip());

try {
    $tomb = $conn->prepare("SELECT credits_left FROM account_tombstones WHERE email_hash = ? AND period = ?");
    $tomb->bind_param("ss", $signup_email_hash, $signup_period);
    $tomb->execute();
    $previous = $tomb->get_result()->fetch_assoc();
    $tomb->close();

    if ($previous) {
        $starting_credits = (int) $previous['credits_left'];
    } else {
        // The address is an exact match; the IP is not -- CGNAT, carriers, campuses
        // and households share addresses, so this only BOUNDS repetition rather than
        // claiming identity. An honest household will not reach the limit; someone
        // rotating addresses stops getting full refills.
        $count = $conn->prepare("SELECT COUNT(*) AS n FROM account_tombstones WHERE ip_hash = ? AND period = ?");
        $count->bind_param("ss", $signup_ip_hash, $signup_period);
        $count->execute();
        $seen = (int) ($count->get_result()->fetch_assoc()['n'] ?? 0);
        $count->close();

        if ($seen >= PISTA_TOMBSTONE_IP_LIMIT) {
            error_log('Signup starting at the guest allowance: ' . $seen . ' tombstones for this IP hash this period');
            $starting_credits = PISTA_GUEST_CREDITS;
        }
    }
} catch (\Throwable $e) {
    // Never block a signup over this. The worst case is a full allowance.
    error_log('Tombstone lookup failed (granting the default): ' . $e->getMessage());
}

$stmt = $conn->prepare("INSERT INTO users (fullname, email, password, credits_remaining) VALUES (?, ?, ?, ?)");
$stmt->bind_param("sssi", $fullname, $email, $hashed_password, $starting_credits);

// PHP 8.1+ defaults mysqli to MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT and configure.php
// never calls mysqli_report(), so execute() THROWS -- it does not return false. The
// previous `if (execute()) {...} else {...}` had an unreachable else, so a duplicate
// email produced a 500 with no body and index.js rendered "Network error occured."
// Same root cause as the dead connect_error checks catalogued separately in Phase 0C.
try {
    $stmt->execute();
} catch (mysqli_sql_exception $e) {
    if ((int) $e->getCode() === 1062) {
        pista_signup_fail($duplicate_message);
    }

    // Never echo $e->getMessage() -- it can carry the query and schema detail.
    error_log("Signup insert failed: " . $e->getMessage());
    pista_signup_fail("Could not create your account. Please try again later.");
}

$new_user_id = $stmt->insert_id;

// Session fixation defence -- see login.php
session_regenerate_id(true);

// A new signup has no "remember me" box, so its session behaves like an unticked
// login: it dies after PISTA_SESSION_IDLE_SECONDS of silence.
pista_mark_authenticated($new_user_id, false);

// Can edit the amount of time that the cookie is valid for in seconds
$cookie_time = time() + (86400 * 3);
pista_set_client_cookie("user_id", $new_user_id, $cookie_time);
pista_set_client_cookie("fullName", $fullname, $cookie_time);

echo json_encode(["success" => true]);

$stmt->close();
$conn->close();
?>
