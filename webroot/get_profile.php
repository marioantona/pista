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
$profile = ["details" => null, "preferences" => null, "profile_picture_url" => null,
            "auth_method" => "password", "oauth_provider" => null];

// fetch profile_picture_url from users table, plus HOW this account signs in:
// an OAuth-only account has password IS NULL, so asking it for a password (as
// DeleteAccount.html used to) can never succeed. Never send the hash itself.
$pic_stmt = $conn->prepare("SELECT profile_picture_url, password IS NULL AS oauth_only, oauth_provider FROM users WHERE user_id = ?");
// 'local' is the default provider value for an email signup, so it does not count
// as a linked provider.
$pic_stmt->bind_param("i", $user_id);
$pic_stmt->execute();
$pic_res = $pic_stmt->get_result();
if ($pic_row = $pic_res->fetch_assoc()) {
    $profile["profile_picture_url"] = $pic_row["profile_picture_url"]; // null for email signups
    $linked = !empty($pic_row["oauth_provider"]) && $pic_row["oauth_provider"] !== 'local';
    // An account can have BOTH: signed up with a password, later linked a provider
    // (oauth_callback.php backfills on a matching email). Those people usually sign
    // in with the provider, so asking only for the password is a surprise.
    $profile["auth_method"] = $pic_row["oauth_only"] ? "oauth" : ($linked ? "both" : "password");
    $profile["oauth_provider"] = $linked ? $pic_row["oauth_provider"] : null;
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