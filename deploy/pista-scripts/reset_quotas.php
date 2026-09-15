<?php
// Security Check: Ensure this script is ONLY run via the server's command line (CRON), not via a web browser.
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    die("Forbidden. This script can only be executed via the command line.\n");
}

require_once '/var/www/html/env.php';

$conn = new mysqli($_ENV['DB_HOST'], $_ENV['DB_USER'], $_ENV['DB_PASS'], $_ENV['DB_NAME']);
if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error . "\n");
}

echo "Starting Monthly Quota Reset...\n";

// Reset all registered users to 10 credits
$update_users = "UPDATE users SET credits_remaining = 10";
if ($conn->query($update_users) === TRUE) {
    echo "[SUCCESS] All registered users have been reset to 10 credits.\n";
} else {
    echo "[ERROR] Failed to update user quotas: " . $conn->error . "\n";
}

// Clear guest usage - gives each ip a new search each month
$clear_guests = "TRUNCATE TABLE guest_usage";
if ($conn->query($clear_guests) === TRUE) {
    echo "[SUCCESS] Guest usage table has been cleared.\n";
} else {
    echo "[ERROR] Failed to clear guest usage: " . $conn->error . "\n";
}

$conn->close();
echo "Quota Reset Complete.\n";
?>