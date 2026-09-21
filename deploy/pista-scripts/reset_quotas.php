<?php
// Security Check: Ensure this script is ONLY run via the server's command line (CRON), not via a web browser.
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    die("Forbidden. This script can only be executed via the command line.\n");
}

require_once '/var/www/html/env.php';

// PHP 8.1+ defaults mysqli to MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT, so every call
// below THROWS on failure rather than returning false. The previous version of this file
// checked $conn->connect_error and tested `query() === TRUE`, both of which were dead
// code for that reason -- the same root cause as signup.php's unreachable else branch.
// That mattered here more than anywhere: this runs monthly from cron, unattended, so a
// failure surfaced as an uncaught exception rather than the [ERROR] line below.
try {
    $conn = new mysqli($_ENV['DB_HOST'], $_ENV['DB_USER'], $_ENV['DB_PASS'], $_ENV['DB_NAME']);
} catch (mysqli_sql_exception $e) {
    fwrite(STDERR, "[ERROR] Database connection failed: " . $e->getMessage() . "\n");
    exit(1);
}

echo "Starting Monthly Quota Reset...\n";

// The two resets are independent. Attempt both even if the first fails, so one run
// reports every problem rather than hiding the second behind the first.
$failed = false;

// Reset all registered users to 10 credits
try {
    $conn->query("UPDATE users SET credits_remaining = 10");
    // affected_rows counts rows CHANGED, not matched, so a user already holding 10
    // credits is not counted. A number lower than the user count is normal, not a
    // partial failure -- worth saying, because the log is read when something is wrong.
    echo "[SUCCESS] All registered users have been reset to 10 credits ({$conn->affected_rows} changed).\n";
} catch (mysqli_sql_exception $e) {
    fwrite(STDERR, "[ERROR] Failed to update user quotas: " . $e->getMessage() . "\n");
    $failed = true;
}

// Clear guest usage - gives each ip a new search each month.
//
// DELETE, not TRUNCATE. TRUNCATE is DDL and requires the DROP privilege, which would
// mean handing DROP on a table to the user every PHP endpoint connects as -- reachable
// through any SQL injection. It buys nothing here: guest_usage has no AUTO_INCREMENT to
// reset (the primary key is ip_address) and holds a handful of rows. See RUNBOOK §17.
try {
    $conn->query("DELETE FROM guest_usage");
    echo "[SUCCESS] Guest usage table has been cleared ({$conn->affected_rows} deleted).\n";
} catch (mysqli_sql_exception $e) {
    fwrite(STDERR, "[ERROR] Failed to clear guest usage: " . $e->getMessage() . "\n");
    $failed = true;
}

// Tombstones only matter inside the period they were written in: once the monthly
// reset has run, a returning user would have been refilled anyway, so keeping the
// row would punish them twice. Prior periods go (Phase 0C).
//
// This runs AFTER the reset above, and deletes rows from earlier periods only --
// today's own deletions are left alone, since this script runs on the 1st and a
// tombstone written today belongs to the period just starting.
try {
    $period = date('Y-m');
    $tomb = $conn->prepare("DELETE FROM account_tombstones WHERE period <> ?");
    $tomb->bind_param("s", $period);
    $tomb->execute();
    echo "[SUCCESS] Old account tombstones cleared ({$tomb->affected_rows} deleted).\n";
    $tomb->close();
} catch (mysqli_sql_exception $e) {
    fwrite(STDERR, "[ERROR] Failed to clear account tombstones: " . $e->getMessage() . "\n");
    $failed = true;
}

$conn->close();

// Non-zero exit so the failure is visible to cron and to anyone running this by hand,
// not just buried in quota_reset.log.
if ($failed) {
    fwrite(STDERR, "Quota Reset FAILED.\n");
    exit(1);
}

echo "Quota Reset Complete.\n";
