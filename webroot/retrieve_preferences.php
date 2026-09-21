<?php

// Starting the session
require_once __DIR__ . '/session.php';

// Connecting to the database
include("configure.php");
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json');

// This endpoint answers JSON, so it must not redirect -- a fetch() would
// follow the 302 and try to parse index.html. Emitting null matches the
// existing "user has no preferences saved" response shape, so any caller
// already handling that branch degrades cleanly.
$user_id = pista_current_user($conn);
if ($user_id === null) {
    http_response_code(401);
    echo json_encode(null);
    exit();
}


// Retrieving the data from the database
$stmt = $conn->prepare("SELECT * FROM preferences WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

// Returning the data in JSON format
if ($row = $result->fetch_assoc()) {
    echo (json_encode($row));
} 
else {
    echo (json_encode(null));
}

$stmt->close();
$conn->close();

?>