<?php
require 'configure.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $token = $_POST['token'] ?? '';
    $new_password = $_POST['password'] ?? '';

    if (empty($token) || empty($new_password)) {
        echo json_encode(['success' => false, 'message' => 'Missing token or password.']);
        exit;
    }

    // We hash the incoming raw token to compare it to the DB
    $token_hash = hash('sha256', $token);

    try {
        $pdo = new PDO("mysql:host=$database_host;dbname=$database_name;charset=utf8", $database_user, $database_pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Find user by token hash
        $stmt = $pdo->prepare("SELECT user_id, reset_token_expires_at FROM users WHERE reset_token_hash = :hash");
        $stmt->execute(['hash' => $token_hash]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            echo json_encode(['success' => false, 'message' => 'Invalid or expired token.']);
            exit;
        }

        // Check if token expired
        if (strtotime($user['reset_token_expires_at']) <= time()) {
            echo json_encode(['success' => false, 'message' => 'Token has expired. Please request a new one.']);
            exit;
        }

        // Hash new password
        $password_hash = password_hash($new_password, PASSWORD_BCRYPT);

        // Update password and invalidate token
        $updateStmt = $pdo->prepare("UPDATE users SET password = :password, reset_token_hash = NULL, reset_token_expires_at = NULL WHERE user_id = :id");
        $updateStmt->execute([
            'password' => $password_hash,
            'id' => $user['user_id']
        ]);

        echo json_encode(['success' => true, 'message' => 'Password has been successfully reset.']);

    } catch (PDOException $e) {
        error_log("Database error in reset password: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'An error occurred. Please try again later.']);
    }
}
?>