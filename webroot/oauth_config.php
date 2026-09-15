<?php
require_once __DIR__ . '/env.php';

if (!defined('BASE_URL')) {
    define('BASE_URL', $_ENV['APP_BASE_URL']);
}

$oauth_config = [
    'google' => [
        'client_id' => $_ENV['GOOGLE_CLIENT_ID'],
        'client_secret' => $_ENV['GOOGLE_CLIENT_SECRET'],
        'redirect_uri' => BASE_URL . '/oauth_callback.php',
        'auth_url' => 'https://accounts.google.com/o/oauth2/v2/auth',
        'token_url' => 'https://oauth2.googleapis.com/token',
        'api_url' => 'https://www.googleapis.com/oauth2/v2/userinfo',
        'scope' => 'email profile'
    ],
    'microsoft' => [
        'client_id' => $_ENV['MICROSOFT_CLIENT_ID'],
        'client_secret' => $_ENV['MICROSOFT_CLIENT_SECRET'],
        'redirect_uri' => BASE_URL . '/oauth_callback.php',
        'auth_url' => 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        'token_url' => 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        'api_url' => 'https://graph.microsoft.com/v1.0/me',
        'scope' => 'openid email profile User.Read'
    ]
];
?>