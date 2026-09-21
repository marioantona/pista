<?php
// Return the credits for a search that failed — Phase 0C, charge-on-success.
//
// check_quota.php charges before the search, because Node cannot reach the
// database and the price has to be known in advance. So a failed search has to be
// given back. The hard part is not the refund, it is refusing a dishonest one:
//
//   - the browser cannot be believed when it says a search failed, or every search
//     would be free, so the caller must present a receipt SIGNED BY NODE, which is
//     the only party that knows the outcome (pista-api/apiToken.js);
//   - a receipt must work once, so its jti is the PRIMARY KEY of `refunds` and the
//     insert is what claims it -- not a SELECT first, which would race;
//   - a receipt carries the subject it was issued to, so it cannot be redeemed
//     into someone else's account;
//   - and failures still cost real SerpAPI calls, so a monthly cap bounds anyone
//     submitting searches designed to fail.
//
// Verification is a signature check, not a conversation with Node: this endpoint
// never calls out, and works even if the router is down.

require_once __DIR__ . '/session.php';
header('Content-Type: application/json');

require_once __DIR__ . '/configure.php';
require_once __DIR__ . '/client_ip.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/api_token.php';

// Failure-refunds allowed per subject per calendar month. Generous for the real
// case (an upstream outage), tight enough that deliberately failing searches is
// not a way to spend our SerpAPI quota for free.
const PISTA_REFUND_MONTHLY_CAP = 3;

// One message for every refusal. A caller learns whether it worked, nothing more:
// which check failed is operator information, and goes to the log.
function pista_refund_refuse(string $log_detail): void
{
    error_log('Refund refused: ' . $log_detail);
    echo json_encode(['success' => false, 'error' => 'That refund could not be processed.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$receipt = is_array($input) && isset($input['receipt']) && is_string($input['receipt'])
    ? $input['receipt']
    : '';

if ($receipt === '') {
    pista_refund_refuse('no receipt supplied');
}

$claims = pista_verify_refund_receipt($receipt);
if ($claims === null) {
    pista_refund_refuse('receipt failed verification');
}

// Who is asking, and who was the receipt issued to? These must be the same, or a
// receipt would be a bearer instrument redeemable by whoever holds it.
$user_id = pista_current_user($conn);
if ($user_id !== null) {
    $subject = 'u:' . $user_id;
} else {
    $guest_ip = pista_client_ip();
    $subject = 'g:' . hash('sha256', $guest_ip);
}

if (!hash_equals($subject, $claims['sub'])) {
    pista_refund_refuse('receipt subject does not match the caller');
}

// The cap is counted before the claim, from this subject's own rows.
$cap_stmt = $conn->prepare("SELECT COUNT(*) AS used FROM refunds WHERE subject = ? AND refunded_at >= DATE_FORMAT(NOW(), '%Y-%m-01')");
$cap_stmt->bind_param('s', $subject);
$cap_stmt->execute();
$used = (int) ($cap_stmt->get_result()->fetch_assoc()['used'] ?? 0);
$cap_stmt->close();

if ($used >= PISTA_REFUND_MONTHLY_CAP) {
    pista_refund_refuse('monthly refund cap reached for this subject');
}

// Claim the receipt by INSERTING it. The PRIMARY KEY on jti is what makes a
// receipt single-use, including against two requests arriving at once: the loser
// gets errno 1062 rather than a second refund.
try {
    $claim = $conn->prepare("INSERT INTO refunds (jti, subject, credits, calls_spent) VALUES (?, ?, ?, ?)");
    $claim->bind_param('ssii', $claims['jti'], $subject, $claims['credits'], $claims['calls']);
    $claim->execute();
    $claim->close();
} catch (mysqli_sql_exception $e) {
    if ((int) $e->getCode() === 1062) {
        pista_refund_refuse('receipt already refunded');
    }
    error_log('Refund claim insert failed: ' . $e->getMessage());
    pista_refund_refuse('could not record the refund');
}

// Only now give the credits back. If this failed the row would still be claimed,
// which is the safe direction to fail: nobody is paid twice.
if ($user_id !== null) {
    $give = $conn->prepare("UPDATE users SET credits_remaining = credits_remaining + ? WHERE user_id = ?");
    $give->bind_param('ii', $claims['credits'], $user_id);
    $give->execute();
    $give->close();

    $read = $conn->prepare("SELECT credits_remaining FROM users WHERE user_id = ?");
    $read->bind_param('i', $user_id);
} else {
    $give = $conn->prepare("UPDATE guest_usage SET credits_remaining = credits_remaining + ? WHERE ip_address = ?");
    $give->bind_param('is', $claims['credits'], $guest_ip);
    $give->execute();
    $give->close();

    $read = $conn->prepare("SELECT credits_remaining FROM guest_usage WHERE ip_address = ?");
    $read->bind_param('s', $guest_ip);
}

$read->execute();
$remaining = (int) ($read->get_result()->fetch_assoc()['credits_remaining'] ?? 0);
$read->close();
$conn->close();

echo json_encode([
    'success'   => true,
    'refunded'  => $claims['credits'],
    'remaining' => $remaining,
]);
?>
