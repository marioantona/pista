<?php

// Starting the session
require_once __DIR__ . '/session.php';

// Connecting to the database
include("configure.php");

// Using POST to login to the account 
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = trim($_POST["email"]);
    $password = $_POST["password"];

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "error" => "Invalid email format"]);
        exit();
    }

    // Using a select statement to get information from the database
    $stmt = $conn->prepare("SELECT user_id, password FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows>0) {
        $stmt->bind_result($user_id, $hashed_password);
        $stmt->fetch();

        if (password_verify($password, $hashed_password)) {

            // Session fixation defence: issue a brand-new session ID at the
            // exact moment privilege changes. 'true' deletes the old session
            // file, so any ID an attacker planted before login is dead rather
            // than merely orphaned.
            session_regenerate_id(true);

            //echo ("Successful login");
            $_SESSION["user_id"] = $user_id;
            // Displaying the name 
            $namestmt = $conn->prepare("SELECT fullname FROM users WHERE user_id = ?");
            $namestmt->bind_param("i", $user_id);
            $namestmt->execute();
            $namestmt->bind_result($fullname);
            $namestmt->fetch();
            $namestmt->close();

            $pref_stmt = $conn->prepare("SELECT region, unit, currency FROM preferences WHERE user_id = ?");
            $pref_stmt->bind_param("i", $user_id);
            $pref_stmt->execute();
            $pref_result = $pref_stmt->get_result();

            //def. to UK/GBP if user has no preferences yet
            $region = "uk";
            $currency = "gbp";

            if ($pref_row = $pref_result->fetch_assoc()) {
                $region = $pref_row["region"];
                $currency = $pref_row["currency"];
            };
            $pref_stmt->close();

            //fetch lang. preferences from details 
            $lang_stmt = $conn->prepare("SELECT lang FROM details WHERE user_id = ?");
            $lang_stmt->bind_param("i", $user_id);
            $lang_stmt->execute();
            $lang_result = $lang_stmt->get_result();

            $lang = ""; //leave blank if no details exist (JS will fallback to browser lang.)
            if ($lang_row = $lang_result->fetch_assoc()) {
                $lang = $lang_row["lang"];
            }
            $lang_stmt->close();

            // Calculate cookie expiration based on "Remember Me" - if true valid for 30 days otherwise 1 day
            $cookie_time = isset($_POST["remember"]) ? time() + (86400 * 30) : time() + (86400 * 1);

            pista_set_client_cookie("user_id", $user_id, $cookie_time);
            pista_set_client_cookie("fullName", $fullname, $cookie_time);
            pista_set_client_cookie("region", $region, $cookie_time);
            pista_set_client_cookie("currency", $currency, $cookie_time);

            //set new lang cookie if it exists in the db
            if (!empty($lang)) {
                pista_set_client_cookie("lang", $lang, $cookie_time);
            }

            echo json_encode(["success" => true]);
            exit();
        }
        else {
            echo json_encode(["success" => false, "error" => "Incorrect password entered"]);
            exit();
        }
    }
    else {
        echo json_encode(["success" => false, "error" => "No user found"]);
        exit();
    }

    $stmt->close();
    $conn->close();
}
?>