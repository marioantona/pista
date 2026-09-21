<?php
require_once __DIR__ . '/session.php';
require_once 'oauth_config.php';

$provider = isset($_GET['provider']) ? strtolower($_GET['provider']) : '';

if (!array_key_exists($provider, $oauth_config)) {
    // Same failure path as oauth_callback.php: the user goes back to the sign-in
    // modal with a generic message, the detail goes to the log (item 8).
    error_log('OAuth handler called with an unknown provider');
    header('Location: index.html?auth_error=oauth');
    exit();
}

$config = $oauth_config[$provider];

// Generate a random state to prevent Cross-Site Request Forgery (CSRF)
$_SESSION['oauth_state'] = bin2hex(random_bytes(16));
$_SESSION['oauth_provider'] = $provider;

// 'delete' means: prove you are still this person, then come back -- do not log
// anyone in, and do not create anything. delete_account.php does the deleting;
// this round trip only produces the proof (Phase 0C).
$_SESSION['oauth_purpose'] = (isset($_GET['purpose']) && $_GET['purpose'] === 'delete') ? 'delete' : 'login';

// Build the authorization URL
$params = [
    'client_id' => $config['client_id'],
    'redirect_uri' => $config['redirect_uri'],
    'response_type' => 'code',
    'scope' => $config['scope'],
    'state' => $_SESSION['oauth_state']
];

// Microsoft requires response_mode for standard auth flows
if ($provider === 'microsoft') {
    $params['response_mode'] = 'query';
}

$auth_url = $config['auth_url'] . '?' . http_build_query($params);

// Redirect user to Google/Microsoft
header('Location: ' . $auth_url);
exit();
?>