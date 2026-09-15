<?php
require 'configure.php';

header('Content-Type: application/json');

// Must match signup.php exactly. If they drift, the reset flow becomes a bypass for
// whatever rule signup enforces. See signup.php for why the ceiling is measured in bytes.
const PISTA_PASSWORD_MIN = 8;
const PISTA_PASSWORD_MAX_BYTES = 72;

function pista_reset_fail(string $message): void {
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    pista_reset_fail('Method not allowed.');
}

$token = $_POST['token'] ?? '';
$new_password = $_POST['password'] ?? '';

if ($token === '' || $new_password === '') {
    pista_reset_fail('Missing token or password.');
}

if (mb_strlen($new_password) < PISTA_PASSWORD_MIN) {
    pista_reset_fail('Password must be at least ' . PISTA_PASSWORD_MIN . ' characters.');
}

if (strlen($new_password) > PISTA_PASSWORD_MAX_BYTES) {
    pista_reset_fail('Password must be ' . PISTA_PASSWORD_MAX_BYTES . ' bytes or fewer.');
}

// We hash the incoming raw token to compare it to the DB
$token_hash = hash('sha256', $token);

try {
    $pdo = new PDO("mysql:host=$database_host;dbname=$database_name;charset=utf8mb4", $database_user, $database_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Find user by token hash
    $stmt = $pdo->prepare("SELECT user_id, reset_token_expires_at FROM users WHERE reset_token_hash = :hash");
    $stmt->execute(['hash' => $token_hash]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        pista_reset_fail('Invalid or expired token.');
    }

    // Check if token expired
    if (strtotime($user['reset_token_expires_at']) <= time()) {
        pista_reset_fail('Token has expired. Please request a new one.');
    }

    // PASSWORD_DEFAULT, matching signup.php. Identical to PASSWORD_BCRYPT today; the
    // day PHP moves its default the two files would otherwise silently disagree about
    // which algorithm a password was stored under.
    $password_hash = password_hash($new_password, PASSWORD_DEFAULT);

    // Update password and invalidate token
    $updateStmt = $pdo->prepare("UPDATE users SET password = :password, reset_token_hash = NULL, reset_token_expires_at = NULL WHERE user_id = :id");
    $updateStmt->execute([
        'password' => $password_hash,
        'id' => $user['user_id']
    ]);

    // NOT invalidating existing sessions here is deliberate and scheduled, not missed:
    // Phase 0C owns it (docs/RUNBOOK.md section 15). Someone resetting BECAUSE they
    // suspect compromise currently leaves the attacker logged in, and fixing that needs
    // session-store work rather than a line here.

    echo json_encode(['success' => true, 'message' => 'Password has been successfully reset.']);

} catch (\Throwable $e) {
    error_log("Database error in reset password: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred. Please try again later.']);
}
?>
