<?php

// Starting the session
require_once __DIR__ . '/session.php';

// Connecting to the database
include("configure.php");

// See details.php -- native form post, so redirect rather than JSON.
if (!isset($_SESSION["user_id"])) {
    header("Location: index.html");
    exit();
}

// Getting the data from each of the variables 
$user_id = $_SESSION["user_id"];

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Making a variable for all of the different preferences
    $region = $_POST["region"];
    $unit = $_POST["unit"];
    $currency = $_POST["currency"];

    // Testing if there are already preferences in the database
    $stmt = $conn->prepare("SELECT user_id FROM preferences WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        // There is already preferences so update them
        $stmt = $conn->prepare( "UPDATE preferences SET region = ?, unit = ?, currency = ?
            WHERE user_id = ?");
        $stmt->bind_param("sssi", $region, $unit, $currency, $user_id);
    }
    else {
        // There are not preferences so insert them into the database
        $stmt = $conn->prepare("INSERT INTO preferences (region, unit, currency, user_id)
            VALUES (?, ?, ?, ?)");
        $stmt->bind_param("sssi", $region, $unit, $currency, $user_id);
    }

    $stmt->execute();
    $stmt->close();
    $conn->close();
    
    //Update the live cookies rn so that the user doesn't have to log out and back in to see changes.
    //valid for 30 days
    $cookie_time = time() + (86400 * 30);
    pista_set_client_cookie("region", $region, $cookie_time);
    pista_set_client_cookie("currency", $currency, $cookie_time);

    // Return the user to the account page when they have updated their settings
    header("Location: account.html");
}

?>