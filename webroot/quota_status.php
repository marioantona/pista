<?php
// Read-only credit balance, for the price line on the search form.
//
// Deliberately separate from check_quota.php, which CHARGES. Nothing here writes:
// the form reads this on load and after a search, and a page refresh must never
// cost a credit. Guests are keyed on the validated client IP, exactly as the quota
// is, so the number shown is the one that will be spent.

require_once __DIR__ . '/session.php';
header('Content-Type: application/json');

require_once __DIR__ . '/configure.php';
require_once __DIR__ . '/client_ip.php';

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed.']);
    exit;
}

if (isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT credits_remaining FROM users WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        echo json_encode(['success' => false, 'error' => 'User account not found.']);
        $conn->close();
        exit;
    }

    echo json_encode([
        'success'   => true,
        'type'      => 'registered',
        'remaining' => (int) $row['credits_remaining'],
    ]);
} else {
    // No row yet means this IP has never searched, so it still has the full
    // allowance. check_quota.php creates the row when it first charges.
    $guest_ip = pista_client_ip();
    $stmt = $conn->prepare('SELECT credits_remaining FROM guest_usage WHERE ip_address = ?');
    $stmt->bind_param('s', $guest_ip);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    echo json_encode([
        'success'   => true,
        'type'      => 'guest',
        'remaining' => $row ? (int) $row['credits_remaining'] : 2,
    ]);
}

$conn->close();
?>
