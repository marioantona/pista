<?php

// Starting the session
require_once __DIR__ . '/session.php';

// Connecting to the database
include("configure.php");

// Reject unauthenticated requests before touching $_SESSION or the database.
// Without this, $user_id is NULL and the INSERT fails on the foreign key,
// producing a 500 and a stack of log noise. This form posts natively (see
// account.html), so the correct response is a redirect, not JSON.
if (!isset($_SESSION["user_id"])) {
    header("Location: index.html");
    exit();
}


// Getting the data from each of the variables
$user_id = $_SESSION["user_id"];

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Making a variable for all of the different details
    $first_name = $_POST["first_name"];
    $middle_name = $_POST["middle_name"];
    $last_name = $_POST["last_name"];

    $date_of_birth = !empty($_POST["date_of_birth"]) ? $_POST["date_of_birth"] : NULL;
    $lang = $_POST["lang"];

    // Testing if there are already details in the database
    $stmt = $conn->prepare("SELECT user_id FROM details WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        // There is already details so update them
        $stmt = $conn->prepare( "UPDATE details SET first_name = ?, middle_name = ?, last_name = ?,
            date_of_birth = ?, lang = ? WHERE user_id = ?");
        $stmt->bind_param("sssssi", $first_name, $middle_name, $last_name, $date_of_birth, $lang, $user_id);
    }
    else {
        // There are not details so insert them into the database
        $stmt = $conn->prepare("INSERT INTO details (first_name, middle_name, last_name,
        date_of_birth, lang, user_id) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssi", $first_name, $middle_name, $last_name, $date_of_birth, $lang, $user_id);
    };

    $stmt->execute();
    $stmt->close();
    $conn->close();

    pista_set_client_cookie("lang", $lang, time() + (86400 * 30));
        
    // Return the user to the account page when they have updated their settings
    header("Location: account.html");
};
?>