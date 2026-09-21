<?php

// Starting the session
require_once __DIR__ . '/session.php';

// Connecting to the database
include("configure.php");
require_once __DIR__ . '/auth.php';

// Ensure the user is actually logged in before trying to read the session
$user_id = pista_current_user($conn);
if ($user_id === null) {
    echo json_encode([]);
    exit;
}

// $user_id = 1;

// Getting the itineraries form the database
$itin_stmt = $conn->prepare("SELECT * FROM itineraries WHERE user_id = ?");
$itin_stmt->bind_param("i", $user_id);
$itin_stmt->execute();
$itin_result = $itin_stmt->get_result();

// Making a list for all of the itineraries the account has
$itin_list = [];
while ($row = $itin_result->fetch_assoc()) {
    $itinerary_id = $row["itinerary_id"];

    // Getting the flights 
    $flight_stmt = $conn->prepare("SELECT * FROM flights WHERE itinerary_id = ?");
    $flight_stmt->bind_param("i", $itinerary_id);
    $flight_stmt->execute();
    $flight_result = $flight_stmt->get_result();

    // Making a list for all of the flights per itinerary 
    $flights = [];
    while ($flight = $flight_result->fetch_assoc()) {
        $flights[] = [
            "flight_id"     => (int)    $flight["flight_id"],
            "from"          =>          $flight["starting_point"],
            "to"            =>          $flight["ending_point"],
            "price"         => (float)  $flight["cost"],
            "previous_cost" => $flight["previous_cost"] !== null ? (float) $flight["previous_cost"] : null,     
            "airline"       =>          $flight["airline"],
            "airline_logo"  =>          $flight["airline_logo"],
            "date"          =>          $flight["flight_date"]
        ];
    }


    $itin_list[] = [
    "itinerary_id"  => (int)    $itinerary_id,
    "total_cost"    => (float)  $row["total_cost"],
    "previous_cost" => $row["previous_cost"] !== null ? (float) $row["previous_cost"] : null,
    "currency"      =>          $row["currency"],
    "adults"        => (int)    $row["adults"],
    "children"      => (int)    $row["children"],
    "flights"       =>          $flights
    ];

    $flight_stmt->close();
}

$itin_stmt->close();
$conn->close();

header('Content-Type: application/json');
echo json_encode($itin_list, JSON_PRETTY_PRINT);
?>