<?php
require_once __DIR__ . '/session.php';
include("configure.php");
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json');

$user_id = pista_current_user($conn);
if ($user_id === null) {
    echo json_encode(["success" => false, "error" => "Not logged in"]);
    exit();
}
$profile = ["details" => null, "preferences" => null, "profile_picture_url" => null];

// fetch profile_picture_url from users table
$pic_stmt = $conn->prepare("SELECT profile_picture_url FROM users WHERE user_id = ?");
$pic_stmt->bind_param("i", $user_id);
$pic_stmt->execute();
$pic_res = $pic_stmt->get_result();
if ($pic_row = $pic_res->fetch_assoc()) {
    $profile["profile_picture_url"] = $pic_row["profile_picture_url"]; // null for email signups
}
$pic_stmt->close();

// 1. Get Personal Details
$stmt1 = $conn->prepare("SELECT first_name, middle_name, last_name, date_of_birth, lang FROM details WHERE user_id = ?");
$stmt1->bind_param("i", $user_id);
$stmt1->execute();
$res1 = $stmt1->get_result();
if ($row = $res1->fetch_assoc()) {
    $profile["details"] = $row;
}
$stmt1->close();

// 2. Get Unit & Currency Preferences
$stmt2 = $conn->prepare("SELECT region, unit, currency FROM preferences WHERE user_id = ?");
$stmt2->bind_param("i", $user_id);
$stmt2->execute();
$res2 = $stmt2->get_result();
if ($row = $res2->fetch_assoc()) {
    $profile["preferences"] = $row;
}
$stmt2->close();

echo json_encode(["success" => true, "data" => $profile]);
$conn->close();
?>