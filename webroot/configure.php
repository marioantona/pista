<?php

require_once __DIR__ . '/env.php';

// Most flights one itinerary may hold: the UI allows 10 destinations, plus the
// return leg. Price verification spends one SerpAPI call per flight, so this is
// a cost cap, not a UI nicety (Phase 0B item 7). Mirrors MAX_ITINERARY_LEGS in
// pista-api/requestLimits.js -- change both together.
if (!defined('PISTA_MAX_ITINERARY_LEGS')) {
    define('PISTA_MAX_ITINERARY_LEGS', 11);
}

// Database credentials, sourced from /var/www/pista.env
$servername = $_ENV['DB_HOST'];
$username   = $_ENV['DB_USER'];
$password   = $_ENV['DB_PASS'];
$dbName     = $_ENV['DB_NAME'];

// Variable mapping for new PDO scripts (forgot / reset password)
$database_host = $servername;
$database_user = $username;
$database_pass = $password;
$database_name = $dbName;

// Establish MySQLi Connection
$conn = new mysqli($servername, $username, $password, $dbName);

// Check Connection Status
if ($conn->connect_error) {
    error_log("Database connection failed: " . $conn->connect_error);
    die("A system error occured. Please try again later.");
}

// Set Charset for robust internationalization (i18n)
$conn->set_charset("utf8mb4");
?>
