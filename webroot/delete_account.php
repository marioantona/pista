<?php

// Starting the session
require_once __DIR__ . '/session.php';

// Connecting to the database
include("configure.php");
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/client_ip.php';

// Every refusal sends the user back to the form with a reason, instead of the
// blank page this file used to return. DeleteAccount.html posts natively, so a
// bare exit() rendered an empty document and the button appeared to do nothing
// (Phase 0C). The reason is a fixed code, never a message built from input.
function pista_delete_fail(string $code): void
{
    header('Location: DeleteAccount.html?error=' . urlencode($code));
    exit();
}

$user_id = pista_current_user($conn);
if ($user_id === null) {
    header("Location: index.html");
    exit();
}

// How does this account prove itself? An OAuth-only account has password IS NULL,
// and password_verify($p, null) always fails (and raises a PHP 8.1 deprecation),
// which is why those users could never delete their account at all.
$stmt = $conn->prepare("SELECT password, email, credits_remaining FROM users WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$stmt->bind_result($hashed_password, $account_email, $credits_left);
$stmt->fetch();
$stmt->close();

$has_password = is_string($hashed_password) && $hashed_password !== '';

// Proof through the provider, recorded by oauth_callback.php. Five minutes: long
// enough to click through a consent screen, short enough that a forgotten tab
// cannot authorise a deletion later. Single use, consumed on sight.
$reauth_at = isset($_SESSION['reauth_ok_at']) ? (int) $_SESSION['reauth_ok_at'] : 0;
$reauth_fresh = $reauth_at > 0 && (time() - $reauth_at) <= 300;
unset($_SESSION['reauth_ok_at']);

$password = $_POST["password"] ?? '';
$password_ok = $has_password && is_string($password) && $password !== ''
    && password_verify($password, $hashed_password);

// An account with both a password and a linked provider accepts EITHER, because
// either one is how that person actually signs in. An OAuth-only account has no
// hash to check, and a password-only account has no provider to return from, so
// each of those still has exactly one route.
if (!$password_ok && !$reauth_fresh) {
    pista_delete_fail($has_password ? 'password' : 'reauth');
}

// Using a transaction to ensure all data to a user is deleted when the account is deleted
$conn->begin_transaction();

// Deleting preferences
$pref_stmt = $conn->prepare("DELETE FROM preferences WHERE user_id = ?");
$pref_stmt->bind_param("i", $user_id);
$pref_stmt->execute();
$pref_stmt->close();


// Deleting details
$det_stmt = $conn->prepare("DELETE FROM details WHERE user_id = ?");
$det_stmt->bind_param("i", $user_id);
$det_stmt->execute();
$det_stmt->close();

// Refund records are keyed by SUBJECT ('u:<id>'), not by a foreign key, so they
// are the one table that does not cascade -- delete them explicitly or the rows
// outlive the account (Phase 0C). itineraries, flights and remember_tokens all
// cascade from users.
$subject = 'u:' . $user_id;
$ref_stmt = $conn->prepare("DELETE FROM refunds WHERE subject = ?");
$ref_stmt->bind_param("s", $subject);
$ref_stmt->execute();
$ref_stmt->close();

// A tombstone, so deleting and re-registering the same address cannot refill the
// quota (Phase 0C). It records what was LEFT, hashed: never the address itself.
// LEAST() on a repeat inside one period, so a delete-recreate-delete cycle can only
// ever carry the smaller balance forward.
$email_hash = hash('sha256', strtolower(trim((string) $account_email)));
$ip_hash = hash('sha256', pista_client_ip());
$period = date('Y-m');
$credits_left = max(0, (int) $credits_left);

$tomb = $conn->prepare("INSERT INTO account_tombstones (email_hash, ip_hash, credits_left, period)
                        VALUES (?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            credits_left = IF(period = VALUES(period), LEAST(credits_left, VALUES(credits_left)), VALUES(credits_left)),
                            ip_hash = VALUES(ip_hash),
                            period = VALUES(period),
                            deleted_at = CURRENT_TIMESTAMP");
$tomb->bind_param("ssis", $email_hash, $ip_hash, $credits_left, $period);
$tomb->execute();
$tomb->close();

// Deleting the user
$user_stmt = $conn->prepare("DELETE FROM users WHERE user_id = ?");
$user_stmt->bind_param("i", $user_id);
$user_stmt->execute();
$user_stmt->close();

$conn->commit();

// Clearing session and cookies
pista_destroy_session();
pista_clear_remember_cookie();

pista_clear_client_cookie("user_id");
pista_clear_client_cookie("fullName");
pista_clear_client_cookie("region");
pista_clear_client_cookie("currency");
pista_clear_client_cookie("lang");

$conn->close();
header("Location: index.html");
exit();
?>
