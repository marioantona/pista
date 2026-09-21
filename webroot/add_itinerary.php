<?php

// Starting the session
require_once __DIR__ . '/session.php';

// Connecting to the database
include("configure.php");
require_once __DIR__ . '/auth.php';

// Set JSON header immediately
header('Content-Type: application/json');

// Escaping happens at OUTPUT (webroot/escape.js), never on the way in -- Phase 0C
// session 3. htmlspecialchars() used to run on every field below, which cost the
// columns their truth ("Flybe & Co" was stored as "Flybe &amp; Co") while leaving
// the two fields that actually reach a src attribute untouched.
//
// What replaces it is validation against what the column and the product allow,
// refusing rather than silently mangling. CHAR(3) and DATE already rejected junk
// -- as a strict-mode exception reported to the user as "Database error during
// save", which told nobody anything.
function pista_itin_fail(string $message): void
{
    // 422: the request was well-formed JSON and we understood it, but the trip
    // itself is not storable. Ghost Sync treats this as final and stops retrying.
    http_response_code(422);
    echo json_encode(["success" => false, "error" => $message]);
    exit();
}

function pista_iata($value): ?string
{
    if (!is_string($value)) {
        return null;
    }
    $value = strtoupper(trim($value));
    return preg_match('/^[A-Z]{3}$/', $value) === 1 ? $value : null;
}

function pista_flight_date($value): ?string
{
    if (!is_string($value)) {
        return null;
    }
    $value = trim($value);
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m) !== 1) {
        return null;
    }
    return checkdate((int) $m[2], (int) $m[3], (int) $m[1]) ? $value : null;
}

// Free text, stored as the airline spells it. Control characters go (they serve no
// purpose in a name and confuse logs); the 50 is the column, applied in characters
// rather than bytes so an accented name is not cut mid-sequence. No byte below
// 0x20 or at 0x7F can occur inside a UTF-8 multibyte sequence, so stripping them
// bytewise is safe.
function pista_airline($value): string
{
    if (!is_string($value)) {
        return '';
    }
    return mb_substr(trim(preg_replace('/[\x00-\x1F\x7F]/', '', $value)), 0, 50);
}

// This field has never been validated OR escaped, and it lands in src="${...}".
// Only an https URL that fits the column survives; anything else becomes empty,
// which every renderer already treats as "no logo".
function pista_logo_url($value): string
{
    if (!is_string($value)) {
        return '';
    }
    $value = trim($value);
    if ($value === '' || strlen($value) > 255) {
        return '';
    }
    if (stripos($value, 'https://') !== 0 || filter_var($value, FILTER_VALIDATE_URL) === false) {
        return '';
    }
    return $value;
}

$user_id = pista_current_user($conn);
if ($user_id === null) {
    // 401, not a bare 200 with success:false. Ghost Sync decides whether to keep
    // or discard a trip from the status alone: a session that expired mid-sync
    // must not look like a trip the server rejected.
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "User not authenticated."]);
    exit();
}

// Getting the raw JSON input from JS fetch
$json = file_get_contents("php://input");
$data = json_decode($json, true);

// STRICT VALIDATION
if (!$data || !isset($data["flights"]) || !is_array($data["flights"]) || count($data["flights"]) === 0) {
    pista_itin_fail("Invalid or empty flight data.");
}

// Price verification spends one SerpAPI call per saved flight, so an oversized
// trip must never be stored (Phase 0B item 7). No real search produces one.
if (count($data["flights"]) > PISTA_MAX_ITINERARY_LEGS) {
    pista_itin_fail("An itinerary can have at most " . PISTA_MAX_ITINERARY_LEGS . " flights.");
}

if (!isset($data["totalCost"]) || !is_numeric($data["totalCost"])) {
    pista_itin_fail("Invalid total cost.");
}

// Currency falls back rather than failing: it is display state, and GBP is the
// default the rest of the stack already assumes.
$currency = 'GBP';
if (isset($data["currency"]) && is_string($data["currency"])) {
    $candidate = strtoupper(trim($data["currency"]));
    if (preg_match('/^[A-Z]{3}$/', $candidate) === 1) {
        $currency = $candidate;
    }
}
$total_cost = (float) $data["totalCost"];

// Extract passenger counts
$adults = isset($data["adults"]) ? (int) $data["adults"] : 1;
$children = isset($data["children"]) ? (int) $data["children"] : 0;

// Validate every leg up front, so a trip is either wholly acceptable or wholly
// refused -- and so the duplicate check below compares the same values that will
// be stored, rather than deriving its own.
//
// The date may arrive in either of two shapes: a parallel $data["dates"] array
// (how index.js builds a search result) or a "date" on the flight itself (how a
// trip read back from the database looks). Ghost Sync can hand over either.
$legs = [];
foreach ($data["flights"] as $i => $flight) {
    if (!is_array($flight)) {
        pista_itin_fail("Invalid flight data.");
    }

    $from = pista_iata($flight["from"] ?? null);
    $to   = pista_iata($flight["to"] ?? null);
    if ($from === null || $to === null) {
        pista_itin_fail("Each flight needs a three-letter airport code.");
    }

    $raw_date = $data["dates"][$i] ?? ($flight["date"] ?? null);
    $date = pista_flight_date($raw_date);
    if ($date === null) {
        pista_itin_fail("Each flight needs a valid date.");
    }

    $legs[] = [
        "from"    => $from,
        "to"      => $to,
        "date"    => $date,
        "price"   => isset($flight["price"]) && is_numeric($flight["price"]) ? (float) $flight["price"] : 0.00,
        "airline" => pista_airline($flight["airline"] ?? null),
        "logo"    => pista_logo_url($flight["airline_logo"] ?? null),
    ];
}

// DUPLICATE CHECK (Does this trip already exist for this user?)
$first_from = $legs[0]["from"];
$first_to = $legs[0]["to"];
$first_date = $legs[0]["date"];

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
    $itin_stmt->bind_param("idsii", $user_id, $total_cost, $currency, $adults, $children);
    $itin_stmt->execute();
    $itinerary_id = $itin_stmt->insert_id;
    $itin_stmt->close();

    // Inserting into the flights table
    $flight_stmt = $conn->prepare(
        "INSERT INTO flights (itinerary_id, starting_point, ending_point, flight_date, cost, airline, airline_logo) 
        VALUES (?, ?, ?, ?, ?, ?, ?)");

    // The legs were validated above; this loop only stores them.
    foreach ($legs as $leg) {
        $flight_stmt->bind_param(
            "isssdss",
            $itinerary_id,
            $leg["from"],
            $leg["to"],
            $leg["date"],
            $leg["price"],
            $leg["airline"],
            $leg["logo"]
        );
        $flight_stmt->execute();
    }

    $flight_stmt->close();
    $conn->commit();

    echo json_encode(["success" => true, "itinerary_id" => $itinerary_id]);
} catch (\Throwable $e) {
    $conn->rollback();
    // 500, not 422: nothing was decided about the trip, so it is worth retrying.
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database error during save."]);
}

$conn->close();
?>