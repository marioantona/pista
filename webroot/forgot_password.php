<?php
require 'configure.php';
require 'vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
        exit;
    }

    try {
        $pdo = new PDO("mysql:host=$database_host;dbname=$database_name;charset=utf8", $database_user, $database_pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = :email");
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // Security: Always return "success" to prevent email enumeration
        if (!$user) {
            echo json_encode(['success' => true, 'message' => 'If your email is registered, you will receive a reset link shortly.']);
            exit;
        }

        // Generate Secure Token (32 bytes = 64 hex chars)
        $token = bin2hex(random_bytes(32));
        $token_hash = hash('sha256', $token);
        $expiry = date("Y-m-d H:i:s", time() + 1800); // 30 minutes from now

        // Update DB
        $updateStmt = $pdo->prepare("UPDATE users SET reset_token_hash = :hash, reset_token_expires_at = :expiry WHERE email = :email");
        $updateStmt->execute([
            'hash' => $token_hash,
            'expiry' => $expiry,
            'email' => $email
        ]);

        // Setup PHPMailer
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Hostname = 'pistaflights.com';   // FQDN for EHLO + Message-ID
        $mail->CharSet  = 'UTF-8';              // required for ES/CA accented text
        
        // BREVO SMTP CREDENTIALS
        $mail->Host       = 'smtp-relay.brevo.com'; 
        $mail->SMTPAuth   = true;
        $mail->Username   = $_ENV['BREVO_SMTP_USER'];     
        $mail->Password   = $_ENV['BREVO_SMTP_PASS'];     
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        $mail->setFrom('support@pistaflights.com', 'PISTA Support'); 
        $mail->addAddress($email);
        // -----------------------------------------------------

        // The link the user will click (pointing to your static HTML page)
        $resetLink = "http://" . $_SERVER['HTTP_HOST'] . "/ResetPass.html?token=" . $token;

        $mail->isHTML(true);
        $mail->Subject = 'Password Reset Request - PISTA';
        $mail->Body    = "We received a request to reset your password. Click the link below to set a new password:<br><br>
                          <a href='{$resetLink}'>Reset Password</a><br><br>
                          If you did not request this, you can safely ignore this email.<br>This link will expire in 30 minutes.";

        $mail->send();

        echo json_encode(['success' => true, 'message' => 'If your email is registered, you will receive a reset link shortly.']);

    } catch (Exception $e) {
        error_log("Error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'An error occurred. Please try again later.']);
    }
}
?>