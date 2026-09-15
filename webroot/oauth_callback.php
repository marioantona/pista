<?php
require_once __DIR__ . '/session.php';

//=========
// Turn on error reporting temporarily to catch any other issues

// ini_set('display_errors', 1);
// ini_set('display_startup_errors', 1);
// error_reporting(E_ALL);

//=========

require_once 'oauth_config.php';
require_once 'configure.php'; // Assuming this holds your $conn / DB connection

// Verify State to prevent CSRF
if (!isset($_GET['state']) || !isset($_SESSION['oauth_state']) || $_GET['state'] !== $_SESSION['oauth_state']) {
    die("Security check failed (CSRF). Please try logging in again.");
}

if (isset($_GET['error'])) {
    die("OAuth Error: " . htmlspecialchars($_GET['error']));
}

$provider = $_SESSION['oauth_provider'];
$config = $oauth_config[$provider];
$code = $_GET['code'];

// Exchange Authorization Code for Access Token
$token_data = [
    'client_id' => $config['client_id'],
    'client_secret' => $config['client_secret'],
    'redirect_uri' => $config['redirect_uri'],
    'code' => $code,
    'grant_type' => 'authorization_code'
];

$ch = curl_init($config['token_url']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($token_data));
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true); 
$token_response = curl_exec($ch);

if(curl_errno($ch)){
    die("cURL error during token exchange: " . curl_error($ch));
}
curl_close($ch);

$token_json = json_decode($token_response, true);

if (!isset($token_json['access_token'])) {
    die("Failed to obtain access token. Response: " . htmlspecialchars($token_response));
}

$access_token = $token_json['access_token'];

// Fetch User Profile
$ch = curl_init($config['api_url']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $access_token,
    'Accept: application/json'
]);
$profile_response = curl_exec($ch);
curl_close($ch);

$profile = json_decode($profile_response, true);

// Normalize data depending on provider
$email = '';
$name = '';
$oauth_uid = '';
$profile_picture_url = null;

if ($provider === 'google') {
    $email = $profile['email'] ?? '';
    $name = $profile['name'] ?? '';
    $oauth_uid = $profile['id'] ?? '';

    // Google userinfo returns 'picture' as a default CDN URL - safe to store as-is
    $profile_picture_url = !empty($profile['picture']) ? $profile['picture'] : null;
} elseif ($provider === 'microsoft') {
    $email = $profile['mail'] ?? $profile['userPrincipalName'] ?? '';
    $name = $profile['displayName'] ?? '';
    $oauth_uid = $profile['id'] ?? '';

    // Microsoft requires a separate binary request for photos - fall through to avatar system
    $profile_picture_url = null;
}

if (empty($email)) {
    die("Failed to retrieve email address from provider.");
}

// Database Transaction
$user_id = null;
$fullname = $name;

// Look for existing user
$stmt = $conn->prepare("SELECT user_id, email, fullname, oauth_provider FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    // User exists. Log them in.
    $user = $result->fetch_assoc();
    $user_id = $user['user_id'];
    $fullname = $user['fullname']; // Use existing name from DB
    
    // If they previously signed up with a password, but now used OAuth, 
    // update their oauth_provider/uid here so they can use both.
    if (empty($user['oauth_provider'])) {
        $update = $conn->prepare("UPDATE users SET oauth_provider = ?, oauth_uid = ? WHERE user_id = ?");
        $update->bind_param("ssi", $provider, $oauth_uid, $user_id);
        $update->execute();
    }

    // update picture URL if we got one and the user doesn't have one yet
    if ($profile_picture_url !== null) {
        $pic_update = $conn->prepare("UPDATE users SET profile_picture_url = ? WHERE user_id = ? AND (profile_picture_url IS NULL OR profile_picture_url = '')");
        $pic_update->bind_param("si", $profile_picture_url, $user_id);
        $pic_update->execute();
        $pic_update->close();
    }
} else {
    // New user. Register them.
    // Password is set to NULL (allowed by your schema.sql)
    $stmt = $conn->prepare("INSERT INTO users (fullname, email, password, oauth_provider, oauth_uid, profile_picture_url) VALUES (?, ?, NULL, ?, ?, ?)");
    $stmt->bind_param("sssss", $name, $email, $provider, $oauth_uid, $profile_picture_url);
    if ($stmt->execute()) {
        $user_id = $stmt->insert_id;
    } else {
        die("Database error during registration: " . $conn->error);
    }
}

// Replicate exactly what login.php does for sessions/cookies

// Session fixation defence -- see login.php. This MUST come after the state
// check at the top of the file, which reads $_SESSION['oauth_state'] from the
// pre-login session. Regeneration carries session data across, so the check
// has already had what it needs by this point.
session_regenerate_id(true);

// The state value is single-use. Clearing it stops a replayed callback URL
// from passing the CSRF check a second time.
unset($_SESSION['oauth_state']);

$_SESSION["user_id"] = $user_id;

$pref_stmt = $conn->prepare("SELECT region, unit, currency FROM preferences WHERE user_id = ?");
$pref_stmt->bind_param("i", $user_id);
$pref_stmt->execute();
$pref_result = $pref_stmt->get_result();

$region = "uk";
$currency = "gbp";

if ($pref_row = $pref_result->fetch_assoc()) {
    $region = $pref_row["region"];
    $currency = $pref_row["currency"];
}
$pref_stmt->close();

$lang_stmt = $conn->prepare("SELECT lang FROM details WHERE user_id = ?");
$lang_stmt->bind_param("i", $user_id);
$lang_stmt->execute();
$lang_result = $lang_stmt->get_result();

$lang = "";
if ($lang_row = $lang_result->fetch_assoc()) {
    $lang = $lang_row["lang"];
}
$lang_stmt->close();

// OAuth is inherently high-trust, so we default to a 30-day "Remember Me" cookie duration
$cookie_time = time() + (86400 * 30);

pista_set_client_cookie("user_id", $user_id, $cookie_time);
pista_set_client_cookie("fullName", $fullname, $cookie_time);
pista_set_client_cookie("region", $region, $cookie_time);
pista_set_client_cookie("currency", $currency, $cookie_time);

if (!empty($lang)) {
    pista_set_client_cookie("lang", $lang, $cookie_time);
}

// 6. Success! Redirect back to the main app
header("Location: index.html");
exit();
?>