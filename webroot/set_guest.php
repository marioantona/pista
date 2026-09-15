<?php

// Starting the session
require_once __DIR__ . '/session.php';

// Logging out the user if they are continuing as a guest
pista_destroy_session();

// Clear every convenience cookie, not just user_id/fullName. A stale region
// or lang cookie would otherwise follow the user into guest mode and silently
// set the currency and language for their guest searches.
pista_clear_client_cookie("user_id");
pista_clear_client_cookie("fullName");
pista_clear_client_cookie("region");
pista_clear_client_cookie("currency");
pista_clear_client_cookie("lang");

header("Location: index.html");
exit();

?>
