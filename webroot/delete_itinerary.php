<?php
require_once __DIR__ . '/session.php';
include("configure.php");

// Ensure the user is logged in
if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "error" => "Not logged in"]);
    exit();
}

$user_id = $_SESSION["user_id"];

// Get the JSON data from the frontend
$json = file_get_contents("php://input");
$data = json_decode($json, true);

if (isset($data["itinerary_id"])) {
    $itinerary_id = $data["itinerary_id"];

    // Delete the itinerary (ON DELETE CASCADE will automatically delete the linked flights!)
    $stmt = $conn->prepare("DELETE FROM itineraries WHERE itinerary_id = ? AND user_id = ?");
    $stmt->bind_param("ii", $itinerary_id, $user_id);
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "error" => "Database error"]);
    }
    $stmt->close();
} else {
    echo json_encode(["success" => false, "error" => "No ID provided"]);
}

$conn->close();
?>