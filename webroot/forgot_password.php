<?php
require 'configure.php';
require 'vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

header('Content-Type: application/json');

// The single response this endpoint is allowed to give about an email address.
// Registered, unregistered, or registered-but-the-mail-failed must all produce
// THIS string, byte for byte. Anything else re-introduces account enumeration.
// See docs/RUNBOOK.md section 7.
const PISTA_RESET_GENERIC = 'If your email is registered, you will receive a reset link shortly.';

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$email = filter_var($_POST['email'] ?? '', FILTER_SANITIZE_EMAIL);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
    exit;
}

// catch (\Throwable), NOT catch (Exception): the `use PHPMailer\PHPMailer\Exception`
// above aliases the short name, so `catch (Exception $e)` would bind ONLY PHPMailer's
// class and a PDOException from the queries below would escape uncaught -- no JSON
// body, and ForgotPass.html falls through to "A network error occured."
try {
    $pdo = new PDO("mysql:host=$database_host;dbname=$database_name;charset=utf8mb4", $database_user, $database_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = :email");
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Security: Always return "success" to prevent email enumeration
    if (!$user) {
        echo json_encode(['success' => true, 'message' => PISTA_RESET_GENERIC]);
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

    // Built from APP_BASE_URL, never from $_SERVER['HTTP_HOST']: the Host header is
    // client-controlled, so the old version let an attacker have a VALID reset token
    // emailed with a link pointing at a domain they own. APP_BASE_URL carries no
    // trailing slash -- same contract oauth_config.php relies on.
    $resetLink = $_ENV['APP_BASE_URL'] . "/ResetPass.html?token=" . $token;

    $mail->isHTML(true);
    $mail->Subject = 'Password Reset Request - PISTA';
    $mail->Body    = "We received a request to reset your password. Click the link below to set a new password:<br><br>
                      <a href='{$resetLink}'>Reset Password</a><br><br>
                      If you did not request this, you can safely ignore this email.<br>This link will expire in 30 minutes.";

    // A send failure must NOT change the response. Reporting it here would mean the
    // error body appears only for addresses that exist -- turning an SMTP outage into
    // an account-enumeration oracle. The operator's signal is the Apache error log.
    try {
        $mail->send();
    } catch (\Throwable $mailError) {
        error_log("Password reset email failed to send: " . $mailError->getMessage());
    }

    echo json_encode(['success' => true, 'message' => PISTA_RESET_GENERIC]);

} catch (\Throwable $e) {
    error_log("Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred. Please try again later.']);
}
?>
