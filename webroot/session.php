<?php
// Central session bootstrap. Require this instead of calling session_start()
// directly, so that every entry point gets identical cookie hardening.
//
// These parameters apply ONLY to the PHPSESSID cookie.
//
// The convenience cookies set in login.php / signup.php / oauth_callback.php
// (user_id, fullName, region, currency, lang) are read from JavaScript by
// getCookie() in index.js, account.js and itineraries.js, and must NOT be
// httponly. They are not the authentication mechanism: authorisation is always
// $_SESSION['user_id'], which is server-side and unreachable from the browser.

if (session_status() === PHP_SESSION_NONE) {

    // Reject session IDs the server never issued. This closes the pre-login
    // half of session fixation; session_regenerate_id() in the login paths
    // closes the post-login half. Neither is sufficient alone.
    ini_set('session.use_strict_mode', 1);

    session_set_cookie_params([
        'lifetime' => 0,     // expires when the browser closes
        'path'     => '/',
        'domain'   => '',    // host-only. Do NOT set '.pistaflights.com' --
                             // that would broadcast the session to every
                             // present and future subdomain.
        'secure'   => true,  // never sent over plaintext
        'httponly' => true,  // unreadable from JavaScript
        'samesite' => 'Lax'  // MUST be Lax. See below.
    ]);

    // 'Strict' would withhold PHPSESSID on the OAuth callback, which is a
    // cross-site-initiated top-level GET. $_SESSION['oauth_state'] would be
    // missing on every attempt and oauth_callback.php would die on the CSRF
    // check. This holds only while oauth_handler.php sets
    // 'response_mode' => 'query' for Microsoft -- switching that to 'form_post'
    // makes the callback a cross-site POST, which Lax blocks, breaking
    // Microsoft login while Google continues to work.

    session_start();
}


// ---------------------------------------------------------------------------
// Convenience-cookie helper.
//
// user_id, fullName, region, currency and lang are deliberately readable from
// JavaScript -- see the note at the top of this file. They still get Secure
// (never sent in clear text) and SameSite=Lax (not attached to cross-site
// subrequests). Centralised here so a flag cannot be forgotten at one of the
// fifteen call sites.
//
// SameSite must be Lax rather than Strict for the same reason as PHPSESSID:
// the user arrives back from the OAuth provider via a cross-site navigation
// and the page has to be able to greet them by name.
// ---------------------------------------------------------------------------
if (!function_exists('pista_set_client_cookie')) {
    function pista_set_client_cookie($name, $value, $expires)
    {
        setcookie($name, $value, [
            'expires'  => $expires,
            'path'     => '/',
            'secure'   => true,
            'httponly' => false,   // INTENTIONAL: read by getCookie() in the frontend
            'samesite' => 'Lax'
        ]);
    }
}

// ---------------------------------------------------------------------------
// Expire a convenience cookie.
//
// The browser matches cookies for overwriting on name + path + domain, so the
// path here MUST match the one used when setting it ('/'). A mismatch does not
// error -- it silently creates a SECOND cookie of the same name at a different
// path, and document.cookie then returns an unpredictable one of the two.
// ---------------------------------------------------------------------------
if (!function_exists('pista_clear_client_cookie')) {
    function pista_clear_client_cookie($name)
    {
        setcookie($name, '', [
            'expires'  => time() - 42000,
            'path'     => '/',
            'secure'   => true,
            'httponly' => false,
            'samesite' => 'Lax'
        ]);
    }
}

// ---------------------------------------------------------------------------
// The "remember me" cookie.
//
// Unlike the five convenience cookies above, this one IS a credential: it stands
// in for a password once the session cookie is gone. So it is httponly -- no
// script ever needs to read it -- and it lives here only because setcookie()
// belongs in this file (the invariant hook enforces that).
//
// The value is "<selector>:<validator>". auth.php owns what those mean and how
// they rotate; this function only knows how to put one in a browser.
// ---------------------------------------------------------------------------
if (!defined('PISTA_REMEMBER_COOKIE')) {
    define('PISTA_REMEMBER_COOKIE', 'pista_remember');
    define('PISTA_REMEMBER_DAYS', 30);
    // Rotate the validator at most this often, and keep accepting the retired one
    // for this long. The frontend loads several endpoints at once, so without a
    // grace window a concurrent request would look like a stolen cookie.
    define('PISTA_REMEMBER_ROTATE_SECONDS', 60);
    define('PISTA_REMEMBER_GRACE_SECONDS', 120);

    // How long a session that was NOT "remembered" survives without a request.
    //
    // PHPSESSID is a browser-session cookie (lifetime 0 above), but that only
    // binds it to the browser's idea of a session -- and Chrome and Firefox
    // RESTORE session cookies when they reopen tabs, so an unticked login could
    // outlive a browser restart. A restart is undetectable server-side; an idle
    // window is not. 30 minutes matches what PHP's own cleaner enforces
    // (gc_maxlifetime 1440 s, phpsessionclean every 30 min), so this makes the
    // existing behaviour deterministic and ours rather than incidental.
    define('PISTA_SESSION_IDLE_SECONDS', 1800);
}

if (!function_exists('pista_set_remember_cookie')) {
    function pista_set_remember_cookie(string $value, int $expires)
    {
        setcookie(PISTA_REMEMBER_COOKIE, $value, [
            'expires'  => $expires,
            'path'     => '/',
            'secure'   => true,
            'httponly' => true,    // NOT like the convenience cookies: this is auth
            'samesite' => 'Lax'    // Lax for the same OAuth-callback reason as PHPSESSID
        ]);
    }
}

if (!function_exists('pista_clear_remember_cookie')) {
    function pista_clear_remember_cookie()
    {
        setcookie(PISTA_REMEMBER_COOKIE, '', [
            'expires'  => time() - 42000,
            'path'     => '/',
            'secure'   => true,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    }
}

// ---------------------------------------------------------------------------
// Full logout: clear server-side session data, expire the session cookie
// itself, then destroy the session.
//
// session_destroy() alone leaves PHPSESSID sitting in the browser. The ID is
// dead server-side, but it keeps being sent on every subsequent request and
// shows up in logs -- and with use_strict_mode it forces the server to reject
// and reissue on the next visit. Expiring it is the tidy half of logging out.
// ---------------------------------------------------------------------------
if (!function_exists('pista_destroy_session')) {
    function pista_destroy_session()
    {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            // Read the live params rather than hardcoding, so this stays
            // correct if the values at the top of this file ever change.
            $params = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires'  => time() - 42000,
                'path'     => $params['path'],
                'domain'   => $params['domain'],
                'secure'   => $params['secure'],
                'httponly' => $params['httponly'],
                'samesite' => $params['samesite']
            ]);
        }

        session_destroy();
    }
}