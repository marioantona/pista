<?php

// Starting the session
require_once __DIR__ . '/session.php';

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
