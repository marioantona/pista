<?php
require_once __DIR__ . '/session.php';

// Connecting to the database
include("configure.php");

// Using POST to create an account
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $fullname = trim($_POST["fullname"]);
    $email = trim($_POST["email"]);     //trim to remove accidental spaces
    $password = $_POST["password"];
    $confirm_password = $_POST["confirm_password"];
    
    //server-side email validation
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "error" => "Invalid email format"]);
        exit;
    }

    // Checking that the two passwords entered match
    if ($password !== $confirm_password) {
        echo json_encode(["success" => false, "error" => "Passwords do not match"]);
        exit();
    }

    // Creating a password hash
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // Preventing SQL injections by using placeholders
    $stmt = $conn->prepare("INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $fullname, $email, $hashed_password);

    // Executing the SQL
    if ($stmt->execute()) {
        
        $new_user_id = $stmt->insert_id;

        // Session fixation defence -- see login.php
        session_regenerate_id(true);

        $_SESSION["user_id"] = $new_user_id;

        // Can edit the amount of time that the cookie is valid for in seconds
        $cookie_time = time() + (86400 * 3);
        pista_set_client_cookie("user_id", $new_user_id, $cookie_time);
        pista_set_client_cookie("fullName", $fullname, $cookie_time);

        echo json_encode(["success" => true]);
        exit();
    }
    else {
        echo json_encode(["success" => false, "error" => "Error: " . $stmt-> error]);
    }

    $stmt->close();
    $conn->close();
}
?>