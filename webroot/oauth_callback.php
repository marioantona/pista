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
require_once __DIR__ . '/auth.php';

// Every failure below takes this path: a generic redirect for the user, the detail
// for the operator. Until Phase 0B item 8 these were die() calls that printed
// internals to the browser -- one of them the provider's whole token response,
// which can carry an access token.
//
// What may be logged: the provider, an HTTP status, and the provider's own error
// code. What may NEVER be logged: the response body, the access token or the
// authorization code. The error log is the wrong place for a credential, and the
// point of this item is that tokens stop travelling.
function pista_oauth_fail(string $log_detail): void
{
    error_log('OAuth callback failed: ' . $log_detail);
    header('Location: index.html?auth_error=oauth');
    exit();
}

// Verify State to prevent CSRF
if (!isset($_GET['state']) || !isset($_SESSION['oauth_state']) || $_GET['state'] !== $_SESSION['oauth_state']) {
    pista_oauth_fail('state mismatch (CSRF check)');
}

if (isset($_GET['error'])) {
    // The provider's own error code, e.g. access_denied when the user cancels.
    pista_oauth_fail('provider returned error=' . substr((string) $_GET['error'], 0, 100));
}

// Both were read unguarded before item 8: a callback reaching this file without a
// provider in the session, or without a code, produced warnings and a broken page.
$provider = $_SESSION['oauth_provider'] ?? '';
if (!is_string($provider) || !array_key_exists($provider, $oauth_config)) {
    pista_oauth_fail('no valid provider in session');
}

$config = $oauth_config[$provider];
$code = isset($_GET['code']) && is_string($_GET['code']) ? $_GET['code'] : '';
if ($code === '') {
    pista_oauth_fail($provider . ': callback carried no authorization code');
}

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
$token_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$token_curl_error = curl_errno($ch) ? curl_error($ch) : '';
curl_close($ch);

if ($token_curl_error !== '') {
    pista_oauth_fail($provider . ' token exchange cURL error: ' . $token_curl_error);
}

$token_json = json_decode((string) $token_response, true);

if (!isset($token_json['access_token'])) {
    // The provider's error CODE is safe and is what identifies the fault; the body
    // is not, so it never appears here. The HTTP status alone usually says enough.
    pista_oauth_fail(sprintf(
        '%s token exchange returned no access_token (HTTP %d, error=%s)',
        $provider,
        $token_status,
        is_array($token_json) ? substr((string) ($token_json['error'] ?? 'none'), 0, 100) : 'unparseable'
    ));
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
$profile_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$profile_curl_error = curl_errno($ch) ? curl_error($ch) : '';
curl_close($ch);

if ($profile_curl_error !== '') {
    pista_oauth_fail($provider . ' profile fetch cURL error: ' . $profile_curl_error);
}

$profile = json_decode((string) $profile_response, true);
if (!is_array($profile)) {
    pista_oauth_fail($provider . ' profile response was not JSON (HTTP ' . $profile_status . ')');
}

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
    pista_oauth_fail($provider . ' profile carried no email address (HTTP ' . $profile_status . ')');
}

// Re-authentication for account deletion: prove the person at the keyboard still
// controls the provider account, then hand back to delete_account.php. This branch
// creates nothing, logs nobody in and touches no session identity -- the only
// destructive file stays delete_account.php (Phase 0C).
if (($_SESSION['oauth_purpose'] ?? 'login') === 'delete') {
    unset($_SESSION['oauth_purpose']);

    if (!isset($_SESSION['user_id'])) {
        pista_oauth_fail($provider . ': delete re-authentication with no session');
    }

    $current_id = (int) $_SESSION['user_id'];
    $who = $conn->prepare("SELECT email FROM users WHERE user_id = ?");
    $who->bind_param("i", $current_id);
    $who->execute();
    $row = $who->get_result()->fetch_assoc();
    $who->close();

    // The returning identity must be the logged-in account, or a second provider
    // account would be able to authorise someone else's deletion.
    if (!$row || strcasecmp((string) $row['email'], $email) !== 0) {
        pista_oauth_fail($provider . ': delete re-authentication identity mismatch');
    }

    // Short-lived proof. delete_account.php refuses anything older than five
    // minutes, so a stale tab cannot authorise a deletion later.
    $_SESSION['reauth_ok_at'] = time();

    header('Location: DeleteAccount.html?reauth=1');
    exit();
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
    // mysqli throws under PHP 8.1+ defaults, so the old `else` here was dead code
    // that would have printed $conn->error to the browser. Same shape as signup.php.
    $stmt = $conn->prepare("INSERT INTO users (fullname, email, password, oauth_provider, oauth_uid, profile_picture_url) VALUES (?, ?, NULL, ?, ?, ?)");
    $stmt->bind_param("sssss", $name, $email, $provider, $oauth_uid, $profile_picture_url);
    try {
        $stmt->execute();
        $user_id = $stmt->insert_id;
    } catch (mysqli_sql_exception $e) {
        if ((int) $e->getCode() === 1062) {
            // A concurrent callback created the account between the SELECT above and
            // this INSERT. The row exists and is this same person, so log them in
            // rather than failing a login that has already succeeded at the provider.
            $retry = $conn->prepare("SELECT user_id, fullname FROM users WHERE email = ?");
            $retry->bind_param("s", $email);
            $retry->execute();
            $existing = $retry->get_result()->fetch_assoc();
            $retry->close();
            if (!$existing) {
                error_log('OAuth insert hit errno 1062 but no row found for that address');
                pista_oauth_fail($provider . ': duplicate account race, row not found');
            }
            $user_id = $existing['user_id'];
            $fullname = $existing['fullname'];
        } else {
            // Never echo the exception -- it carries the query and schema detail.
            error_log('OAuth registration insert failed: ' . $e->getMessage());
            pista_oauth_fail($provider . ': database error during registration');
        }
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

// OAuth logins are remembered by decision: there is no checkbox on this path and
// re-consent is usually one silent click, so they get the 30-day token below.
pista_mark_authenticated($user_id, true);

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

// OAuth is inherently high-trust, so we default to a 30-day "Remember Me" cookie
// duration -- and, since Phase 0C, to a real remember token to match, so the
// 30 days are not just a name in a cookie.
pista_issue_remember_token($conn, $user_id);

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