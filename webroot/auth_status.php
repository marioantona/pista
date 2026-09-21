<?php
require_once __DIR__ . '/session.php';
require_once __DIR__ . '/configure.php';
require_once __DIR__ . '/auth.php';
header('Content-Type: application/json');

// index.js calls this on every page load, which makes it the place a returning
// visitor's remember token is redeemed: pista_current_user() resumes the session
// and rotates the token before answering (Phase 0C).
$user_id = pista_current_user($conn);

echo json_encode(['logged_in' => $user_id !== null]);
?>