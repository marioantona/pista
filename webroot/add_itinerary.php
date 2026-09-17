<?php

// Starting the session
require_once __DIR__ . '/session.php';

// Connecting to the database
include("configure.php");

// Set JSON header immediately
header('Content-Type: application/json');

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "error" => "User not authenticated."]);
    exit();
}

$user_id = $_SESSION["user_id"];

// Getting the raw JSON input from JS fetch
$json = file_get_contents("php://input");
$data = json_decode($json, true);

// STRICT VALIDATION
if (!$data || !isset($data["flights"]) || !is_array($data["flights"]) || count($data["flights"]) === 0) {
    echo json_encode(["success" => false, "error" => "Invalid or empty flight data."]);
    exit();
}

// Price verification spends one SerpAPI call per saved flight, so an oversized
// trip must never be stored (Phase 0B item 7). No real search produces one.
if (count($data["flights"]) > PISTA_MAX_ITINERARY_LEGS) {
    echo json_encode(["success" => false, "error" => "An itinerary can have at most " . PISTA_MAX_ITINERARY_LEGS . " flights."]);
    exit();
}

if (!isset($data["totalCost"]) || !is_numeric($data["totalCost"])) {
    echo json_encode(["success" => false, "error" => "Invalid total cost."]);
    exit();
}

//extract currency from frontend payload (def. GBP if missing)
$currency = isset($data["currency"]) ? strtoupper(htmlspecialchars(strip_tags($data["currency"]))) : 'GBP';
$total_cost = (float) $data["totalCost"];

// Extract passenger counts
$adults = isset($data["adults"]) ? (int) $data["adults"] : 1;
$children = isset($data["children"]) ? (int) $data["children"] : 0;

// DUPLICATE CHECK (Does this trip already exist for this user?)
$first_flight = $data["flights"][0];
$first_from = htmlspecialchars(strip_tags($first_flight["from"]));
$first_to = htmlspecialchars(strip_tags($first_flight["to"]));
$first_date = isset($data["dates"][0]) ? htmlspecialchars(strip_tags($data["dates"][0])) : "";

$dup_stmt = $conn->prepare("
    SELECT i.itinerary_id 
    FROM itineraries i
    JOIN flights f ON i.itinerary_id = f.itinerary_id
    WHERE i.user_id = ? 
      AND i.total_cost = ? 
      AND f.starting_point = ? 
      AND f.ending_point = ? 
      AND f.flight_date = ?
    LIMIT 1
");

$dup_stmt->bind_param("idsss", $user_id, $total_cost, $first_from, $first_to, $first_date);
$dup_stmt->execute();
$dup_result = $dup_stmt->get_result();

// If duplicate found, silently return success with the existing ID to clear the frontend queue
if ($dup_result->num_rows > 0) {
    $existing = $dup_result->fetch_assoc();
    $dup_stmt->close();
    echo json_encode([
        "success" => true, 
        "itinerary_id" => $existing["itinerary_id"], 
        "message" => "Duplicate silently ignored."
    ]);
    exit();
}
$dup_stmt->close();

// SECURE INSERTION
$conn->begin_transaction();

try {
    // Inserting into the itineraries table
    $itin_stmt = $conn->prepare("INSERT INTO itineraries (user_id, total_cost, currency, adults, children) VALUES (?, ?, ?, ?, ?)");
    $itin_stmt->bind_param("idsii", $user_id, $data["totalCost"], $currency, $adults, $children);
    $itin_stmt->execute();
    $itinerary_id = $itin_stmt->insert_id;
    $itin_stmt->close();

    // Inserting into the flights table
    $flight_stmt = $conn->prepare(
        "INSERT INTO flights (itinerary_id, starting_point, ending_point, flight_date, cost, airline, airline_logo) 
        VALUES (?, ?, ?, ?, ?, ?, ?)");

    // Looping through the data and sanitizing inputs
    foreach ($data["flights"] as $i => $flight) {
        $from = htmlspecialchars(strip_tags($flight["from"]));
        $to = htmlspecialchars(strip_tags($flight["to"]));
        $date = isset($data["dates"][$i]) ? htmlspecialchars(strip_tags($data["dates"][$i])) : "";
        $price = is_numeric($flight["price"]) ? (float) $flight["price"] : 0.00;
        $airline = htmlspecialchars(strip_tags($flight["airline"]));
        $logo = isset($flight["airline_logo"]) ? $flight["airline_logo"] : "";

        $flight_stmt->bind_param(
            "isssdss",
            $itinerary_id,
            $from,
            $to,
            $date,
            $price,
            $airline,
            $logo
        );
        $flight_stmt->execute();
    }

    $flight_stmt->close();
    $conn->commit();

    echo json_encode(["success" => true, "itinerary_id" => $itinerary_id]);
} catch(Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "error" => "Database error during save."]);
}

$conn->close();
?>