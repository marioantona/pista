<?php

// Starting the session
require_once __DIR__ . '/session.php';

// Connecting to the database
include("configure.php");

// Guard both the session and the POST field. Without the second check, a GET
// to this URL raises an undefined-index warning before any auth logic runs.
if (!isset($_SESSION["user_id"]) || !isset($_POST["password"])) {
    header("Location: index.html");
    exit();
}

$user_id = $_SESSION["user_id"];
$password = $_POST["password"];

// Making so the user has to input their password to delete their account
$stmt = $conn->prepare("SELECT password FROM users WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$stmt->bind_result($hashed_password);
$stmt->fetch();
$stmt->close();

// If the password is not correct say incorrect password
if (!password_verify($password, $hashed_password)) {
    exit();
}

// Using a transaction to ensure all data to a user is deleted when the account is deleted
$conn->begin_transaction();

// Deleting preferences 
$pref_stmt = $conn->prepare("DELETE FROM preferences WHERE user_id = ?");
$pref_stmt->bind_param("i", $user_id);
$pref_stmt->execute();
$pref_stmt->close();


// Deleting details 
$det_stmt = $conn->prepare("DELETE FROM details WHERE user_id = ?");
$det_stmt->bind_param("i", $user_id);
$det_stmt->execute();
$det_stmt->close();

// Deleting the user 
$user_stmt = $conn->prepare("DELETE FROM users WHERE user_id = ?");
$user_stmt->bind_param("i", $user_id);
$user_stmt->execute();
$user_stmt->close();

$conn->commit();

// Clearing session and cookies
pista_destroy_session();

pista_clear_client_cookie("user_id");
pista_clear_client_cookie("fullName");
pista_clear_client_cookie("region");
pista_clear_client_cookie("currency");
pista_clear_client_cookie("lang");

$conn->close();
header("Location: index.html");
exit();
?>