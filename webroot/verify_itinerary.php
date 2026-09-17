<?php
require_once __DIR__ . '/session.php';
header('Content-Type: application/json');

// Ensure user is logged in (we only verify saved trips for logged-in users)
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Must be logged in to verify prices.']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Only itinerary_id is read from the request. Everything sent to Node -- the
// flights, region, currency and passenger counts -- comes from the database.
// itineraries.js still posts flights/region/currency; they are ignored on purpose.
// Trusting a client-supplied flights array let one credit buy an unbounded number
// of SerpAPI calls, token or no token (Phase 0B item 7, RUNBOOK §17).
$input = json_decode(file_get_contents('php://input'), true);
$itinerary_id = is_array($input) && isset($input['itinerary_id'])
    ? filter_var($input['itinerary_id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])
    : false;
if ($itinerary_id === false) {
    echo json_encode(['success' => false, 'error' => 'Invalid payload.']);
    exit;
}

require_once __DIR__ . '/configure.php';
require_once __DIR__ . '/api_token.php';

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed.']);
    exit;
}

// Security Check - Ensure the itinerary belongs to this user
$check_stmt = $conn->prepare("SELECT currency, adults, children FROM itineraries WHERE itinerary_id = ? AND user_id = ?");
$check_stmt->bind_param("ii", $itinerary_id, $user_id);
$check_stmt->execute();
$itinerary = $check_stmt->get_result()->fetch_assoc();
$check_stmt->close();
if (!$itinerary) {
    echo json_encode(['success' => false, 'error' => 'Unauthorized or invalid itinerary.']);
    exit;
}

$flights_stmt = $conn->prepare("SELECT flight_id, starting_point, ending_point, flight_date FROM flights WHERE itinerary_id = ? ORDER BY flight_id");
$flights_stmt->bind_param("i", $itinerary_id);
$flights_stmt->execute();
$flights_result = $flights_stmt->get_result();
$flights = [];
while ($f = $flights_result->fetch_assoc()) {
    $flights[] = [
        'flight_id' => (int) $f['flight_id'],
        'from'      => $f['starting_point'],
        'to'        => $f['ending_point'],
        'date'      => $f['flight_date'],
    ];
}
$flights_stmt->close();

$adults   = (int) $itinerary['adults'];
$children = (int) $itinerary['children'];

// Refuse before charging: none of these should reach Node, or cost a credit.
// Node enforces the same bounds (pista-api/requestLimits.js).
if (count($flights) === 0 || count($flights) > PISTA_MAX_ITINERARY_LEGS
    || $adults < 1 || $adults > 9 || $children < 0 || $children > 8
    || $adults + $children > 9) {
    echo json_encode(['success' => false, 'error' => 'This itinerary cannot be verified.']);
    exit;
}

// The user's saved region, with the frontend's own default. Validated because
// preferences.php stores whatever was posted.
$region = 'uk';
$pref_stmt = $conn->prepare("SELECT region FROM preferences WHERE user_id = ?");
$pref_stmt->bind_param("i", $user_id);
$pref_stmt->execute();
$pref = $pref_stmt->get_result()->fetch_assoc();
$pref_stmt->close();
if ($pref && is_string($pref['region']) && preg_match('/^[a-z]{2}$/', $pref['region'])) {
    $region = $pref['region'];
}

// The trip's own currency, so verified prices are stored in the unit the row declares.
$currency = strtoupper((string) $itinerary['currency']);

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
    'flights'  => $flights,
    'region'   => $region,
    'currency' => $currency,
    'adults'   => $adults,
    'children' => $children,
]));

$node_response_raw = curl_exec($ch);
$http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_status !== 200 || !$node_response_raw) {
    echo json_encode(['success' => false, 'error' => 'Failed to reach routing engine for verification.']);
    exit;
}

$node_data = json_decode($node_response_raw, true);
if (!is_array($node_data) || empty($node_data['success'])) {
    echo json_encode(['success' => false, 'error' => $node_data['error'] ?? 'Verification failed.']);
    exit;
}

// Node must answer for exactly the legs it was sent, and nothing else.
$sent_ids = array_column($flights, 'flight_id');
$verified_legs = $node_data['results'] ?? null;
if (!is_array($verified_legs) || count($verified_legs) !== count($flights)) {
    error_log('verify_itinerary.php: Node returned an unexpected result count for itinerary ' . $itinerary_id);
    echo json_encode(['success' => false, 'error' => 'Verification failed.']);
    exit;
}

// Update the Database with the newly fetched prices
$new_total_cost = 0;
$has_unavailable_flights = false;

$update_flight = $conn->prepare("UPDATE flights SET previous_cost = cost, cost = ? WHERE flight_id = ? AND itinerary_id = ?");

foreach ($verified_legs as $leg) {
    $f_id = (int) ($leg['flight_id'] ?? 0);
    if (!in_array($f_id, $sent_ids, true)) {
        continue;
    }
    $leg_cost = is_numeric($leg['price'] ?? null) ? (float) $leg['price'] : -1.00;

    if (($leg['status'] ?? '') === 'unavailable' || $leg_cost < 0) {
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
