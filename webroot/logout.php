<?php

// Starting the session
require_once __DIR__ . '/session.php';
require_once __DIR__ . '/configure.php';
require_once __DIR__ . '/auth.php';

// This device's remember token goes too, or "log out" would last until the next
// page load. Only this device: logging out here must not sign the user out of
// their other browsers (Phase 0C).
pista_revoke_remember_token($conn);

// Destroying the session, expiring its cookie, and clearing the convenience
// cookies before returning the user to the homepage.
pista_destroy_session();

pista_clear_client_cookie("user_id");
pista_clear_client_cookie("fullName");
pista_clear_client_cookie("region");
pista_clear_client_cookie("currency");
pista_clear_client_cookie("lang");

header("Location: index.html");
exit();

?>
