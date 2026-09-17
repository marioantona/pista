<?php
require_once __DIR__ . '/session.php';
header('Content-Type: application/json');

// Ensure user is logged in (we only verify saved trips for logged-in users)
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Must be logged in to verify prices.']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Get the POST JSON payload from the frontend
$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['itinerary_id']) || !isset($input['flights']) || !isset($input['region']) || !isset($input['currency'])) {
    echo json_encode(['success' => false, 'error' => 'Invalid payload.']);
    exit;
}

$itinerary_id = $input['itinerary_id'];
$flights = $input['flights'];

require_once __DIR__ . '/configure.php';
require_once __DIR__ . '/api_token.php';

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed.']);
    exit;
}

// Security Check - Ensure the itinerary belongs to this user
$check_stmt = $conn->prepare("SELECT itinerary_id FROM itineraries WHERE itinerary_id = ? AND user_id = ?");
$check_stmt->bind_param("ii", $itinerary_id, $user_id);
$check_stmt->execute();
if ($check_stmt->get_result()->num_rows === 0) {
    echo json_encode(['success' => false, 'error' => 'Unauthorized or invalid itinerary.']);
    exit;
}
$check_stmt->close();

// Check and deduct Quota (1 credit for price verification)
$stmt = $conn->prepare("SELECT credits_remaining FROM users WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();

if (!$row || $row['credits_remaining'] < 1) {
    echo json_encode(['success' => false, 'error' => 'Insufficient search credits to verify this trip.']);
    exit;
}

$new_quota = $row['credits_remaining'] - 1;
$update_quota = $conn->prepare("UPDATE users SET credits_remaining = ? WHERE user_id = ?");
$update_quota->bind_param("ii", $new_quota, $user_id);
$update_quota->execute();

// Call the Node.js Backend
$node_url = 'http://localhost:3000/api/verify-itinerary';
$ch = curl_init($node_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
// Node refuses /api/verify-itinerary without a 'verify' token (RUNBOOK §17). The
// credit was charged just above.
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-PISTA-Token: ' . pista_api_token('verify', 'u:' . $user_id),
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'flights' => $flights,
    'region' => $input['region'],
    'currency' => $input['currency']
]));

$node_response_raw = curl_exec($ch);
$http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_status !== 200 || !$node_response_raw) {
    echo json_encode(['success' => false, 'error' => 'Failed to reach routing engine for verification.']);
    exit;
}

$node_data = json_decode($node_response_raw, true);
if (!$node_data['success']) {
    echo json_encode(['success' => false, 'error' => $node_data['error']]);
    exit;
}

// Update the Database with the newly fetched prices
$verified_legs = $node_data['results'];
$new_total_cost = 0;
$has_unavailable_flights = false;

$update_flight = $conn->prepare("UPDATE flights SET previous_cost = cost, cost = ? WHERE flight_id = ? AND itinerary_id = ?");

foreach ($verified_legs as $leg) {
    $leg_cost = $leg['price'];
    $f_id = $leg['flight_id'];
    
    if ($leg['status'] === 'unavailable' || $leg_cost < 0) {
        $has_unavailable_flights = true;
        $leg_cost = -1.00;
    } else {
        $new_total_cost += $leg_cost;
    }

    $update_flight->bind_param("dii", $leg_cost, $f_id, $itinerary_id);
    $update_flight->execute();
}

// Update the parent itinerary total
if ($has_unavailable_flights) {
    $new_total_cost = -1.00; // Flag the whole trip as broken
}

$update_itinerary = $conn->prepare("UPDATE itineraries SET previous_cost = total_cost, total_cost = ? WHERE itinerary_id = ? AND user_id = ?");
$update_itinerary->bind_param("dii", $new_total_cost, $itinerary_id, $user_id);
$update_itinerary->execute();

$conn->close();

// Return success to the frontend so it can refresh the UI
echo json_encode(['success' => true, 'new_quota' => $new_quota]);
?>