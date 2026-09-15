<?php
require_once __DIR__ . '/session.php';
require_once 'oauth_config.php';

$provider = isset($_GET['provider']) ? strtolower($_GET['provider']) : '';

if (!array_key_exists($provider, $oauth_config)) {
    die("Invalid OAuth provider.");
}

$config = $oauth_config[$provider];

// Generate a random state to prevent Cross-Site Request Forgery (CSRF)
$_SESSION['oauth_state'] = bin2hex(random_bytes(16));
$_SESSION['oauth_provider'] = $provider;

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