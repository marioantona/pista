<?php

// Starting the session
require_once __DIR__ . '/session.php';

// Connecting to the database
include("configure.php");
require_once __DIR__ . '/auth.php';

// This endpoint always answers JSON, including when it refuses, so the header is
// set before the first possible echo rather than only on the success path.
header('Content-Type: application/json');

// Ensure the user is actually logged in before trying to read the session
$user_id = pista_current_user($conn);
if ($user_id === null) {
    echo json_encode([]);
    exit;
}

// ONE query, not one per itinerary. This used to prepare and execute a second
// statement inside the fetch loop -- the classic N+1: an account with twelve
// saved trips cost thirteen round trips to answer a page load (Phase 0C).
//
// Two details are load-bearing:
//   LEFT, not INNER, so an itinerary whose flight rows are missing still appears
//   rather than silently vanishing from the list.
//   The previous_cost aliases, because BOTH tables have that column -- which is
//   also why the old SELECT * could not survive a join.
// The ORDER BY makes leg order explicit. The frontend rebuilds the route path
// from array position, so it has always depended on an ordering that nothing
// actually asked the database for.
$stmt = $conn->prepare("SELECT i.itinerary_id, i.total_cost, i.previous_cost AS itin_previous_cost,
                               i.currency, i.adults, i.children,
                               f.flight_id, f.starting_point, f.ending_point, f.flight_date,
                               f.cost, f.previous_cost AS flight_previous_cost,
                               f.airline, f.airline_logo
                        FROM itineraries i
                        LEFT JOIN flights f ON f.itinerary_id = i.itinerary_id
                        WHERE i.user_id = ?
                        ORDER BY i.itinerary_id, f.flight_id");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

// Group the flat rows back into itineraries. Keyed by itinerary_id while
// building, then re-indexed, so the response stays a JSON array.
$itin_list = [];
while ($row = $result->fetch_assoc()) {
    $itinerary_id = (int) $row["itinerary_id"];

    if (!isset($itin_list[$itinerary_id])) {
        $itin_list[$itinerary_id] = [
            "itinerary_id"  => $itinerary_id,
            "total_cost"    => (float) $row["total_cost"],
            "previous_cost" => $row["itin_previous_cost"] !== null ? (float) $row["itin_previous_cost"] : null,
            "currency"      => $row["currency"],
            "adults"        => (int) $row["adults"],
            "children"      => (int) $row["children"],
            "flights"       => []
        ];
    }

    // NULL on the flight side means the LEFT JOIN found no legs for this trip.
    if ($row["flight_id"] === null) {
        continue;
    }

    $itin_list[$itinerary_id]["flights"][] = [
        "flight_id"     => (int)    $row["flight_id"],
        "from"          =>          $row["starting_point"],
        "to"            =>          $row["ending_point"],
        "price"         => (float)  $row["cost"],
        "previous_cost" => $row["flight_previous_cost"] !== null ? (float) $row["flight_previous_cost"] : null,
        "airline"       =>          $row["airline"],
        "airline_logo"  =>          $row["airline_logo"],
        "date"          =>          $row["flight_date"]
    ];
}

$stmt->close();
$conn->close();

echo json_encode(array_values($itin_list));
?>
