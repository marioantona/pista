<?php
// Central environment loader. Guarded so it is safe to require from any file,
// in any order, any number of times.

if (!defined('PISTA_ENV_LOADED')) {
    define('PISTA_ENV_LOADED', true);

    require_once __DIR__ . '/vendor/autoload.php';

    // .env lives one level ABOVE the webroot so Apache can never serve it,
    // even if PHP execution fails.
    $dotenv = Dotenv\Dotenv::createImmutable('/var/www', 'pista.env');
    $dotenv->load();

    // Fail loudly at startup rather than silently at first use.
    $dotenv->required([
        'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS',
        'APP_BASE_URL',
        'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
        'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET',
        'BREVO_SMTP_USER', 'BREVO_SMTP_PASS'
    ])->notEmpty();
}