<?php
require_once __DIR__ . '/session.php';
header('Content-Type: application/json');

require_once __DIR__ . '/configure.php';
require_once __DIR__ . '/client_ip.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/api_token.php';
require_once __DIR__ . '/search_cost.php';

// configure.php die()s on a failed connection before this file resumes, so the
// old `if ($conn->connect_error)` block here was unreachable (Phase 0C).

// What this search costs, computed HERE from the shape of the search. The browser
// sends the shape, never the price: a client-supplied cost would be a free search.
// A bigger search runs more SerpAPI calls (RUNBOOK §11), so it costs more credits.
//
// The shape is REQUIRED. Until 19 September 2026 a request without it was charged
// the base price and given a token with no n/d claims, so that clients holding the
// pre-pricing index.js kept working; that fallback is gone, and Node now refuses an
// unbound token too. A request without the counts cannot be priced, so it is refused
// here, before anything is charged.
$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input) || !isset($input['numDestinations'])) {
    echo json_encode(['success' => false, 'error' => 'Invalid search parameters.']);
    exit;
}

$n = filter_var($input['numDestinations'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 10]]);
$includes = isset($input['includeDestinations']) && is_array($input['includeDestinations'])
    ? array_unique(array_filter($input['includeDestinations'], 'is_string'))
    : [];
$d = count($includes);

// The same bounds Node enforces (pista-api/requestLimits.js). Refused here the
// request costs nothing; refused there it has already been charged.
if ($n === false || $d > $n) {
    echo json_encode(['success' => false, 'error' => 'Invalid search parameters.']);
    exit;
}

$cost = pista_search_cost($n, $d);
$search_cost = $cost['credits'];
$claims = ['n' => $n, 'd' => $d, 'cr' => $search_cost];

// Registered user logic
$user_id = pista_current_user($conn);
if ($user_id !== null) {

    // Check and deduct in ONE statement. The old SELECT-then-UPDATE let two
    // parallel searches both read the same balance, both pass the check and both
    // charge -- the quota race in RUNBOOK §12. The condition lives in the WHERE
    // clause, so the database decides, and affected_rows says whether it happened.
    $charge = $conn->prepare("UPDATE users SET credits_remaining = credits_remaining - ? WHERE user_id = ? AND credits_remaining >= ?");
    $charge->bind_param("iii", $search_cost, $user_id, $search_cost);
    $charge->execute();
    $charged = $charge->affected_rows === 1;
    $charge->close();

    $stmt = $conn->prepare("SELECT credits_remaining FROM users WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        echo json_encode(['success' => false, 'error' => 'User account not found.']);
    } elseif (!$charged) {
        // Not charged and the account exists: they cannot afford this search.
        echo json_encode(['success' => false, 'error' => 'This search costs ' . $search_cost . ' credits. You have ' . $row['credits_remaining'] . ' remaining. Quotas reset on the 1st of the month.']);
    } else {
        // The credits are charged; the token is what lets Node run the search,
        // and its n/d claims cap how big that search may be.
        echo json_encode([
            'success' => true, 'remaining' => (int) $row['credits_remaining'], 'type' => 'registered',
            'cost' => $search_cost, 'calls' => $cost['calls'],
            'token' => pista_api_token('search', 'u:' . $user_id, $claims),
        ]);
    }
}
// GUEST USER LOGIC (IP TRACKING)
else {
    // The real client IP, as validated by mod_remoteip rather than asserted by the
    // caller. See client_ip.php for why reading CF-Connecting-IP here would undo it.
    $guest_ip = pista_client_ip();
    $max_guest_credits = 2; // Limit guests to exactly 1 basic search

    // Same atomic deduction as the registered branch. The guest path has an extra
    // case -- the row may not exist yet -- so: try the conditional UPDATE, and only
    // if it changes nothing work out whether that is "no row" or "cannot afford".
    $charge = $conn->prepare('UPDATE guest_usage SET credits_remaining = credits_remaining - ? WHERE ip_address = ? AND credits_remaining >= ?');
    $charge->bind_param('isi', $search_cost, $guest_ip, $search_cost);
    $charge->execute();
    $charged = $charge->affected_rows === 1;
    $charge->close();

    if (!$charged) {
        $stmt = $conn->prepare('SELECT credits_remaining FROM guest_usage WHERE ip_address = ?');
        $stmt->bind_param('s', $guest_ip);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$row && $max_guest_credits >= $search_cost) {
            // First search from this address. Two parallel first searches both reach
            // here, so the PRIMARY KEY is the arbiter: the loser catches 1062 and
            // retries the conditional UPDATE, which then charges exactly once.
            $initial = $max_guest_credits - $search_cost;
            try {
                $insert = $conn->prepare("INSERT INTO guest_usage (ip_address, credits_remaining) VALUES (?, ?)");
                $insert->bind_param("si", $guest_ip, $initial);
                $insert->execute();
                $insert->close();
                $charged = true;
            } catch (mysqli_sql_exception $e) {
                if ((int) $e->getCode() !== 1062) {
                    throw $e;
                }
                $retry = $conn->prepare('UPDATE guest_usage SET credits_remaining = credits_remaining - ? WHERE ip_address = ? AND credits_remaining >= ?');
                $retry->bind_param('isi', $search_cost, $guest_ip, $search_cost);
                $retry->execute();
                $charged = $retry->affected_rows === 1;
                $retry->close();
            }
        }
    }

    if (!$charged) {
        // A guest starts with exactly the base price, so any search that costs more is
        // out of reach however many rows exist. Say so plainly instead of "limit reached".
        $error = $search_cost > $max_guest_credits
            ? 'This search costs ' . $search_cost . ' credits because of its size. Guests get ' . $max_guest_credits . '. Log in or sign up for 10 free monthly credits.'
            : 'Free trial limit reached! Please Log In or Sign Up to receive 10 free monthly credits.';
        echo json_encode(['success' => false, 'error' => $error]);
        $conn->close();
        exit;
    }

    $stmt = $conn->prepare('SELECT credits_remaining FROM guest_usage WHERE ip_address = ?');
    $stmt->bind_param('s', $guest_ip);
    $stmt->execute();
    $remaining = (int) ($stmt->get_result()->fetch_assoc()['credits_remaining'] ?? 0);
    $stmt->close();

    echo json_encode([
        'success' => true, 'remaining' => $remaining, 'type' => 'guest',
        'cost' => $search_cost, 'calls' => $cost['calls'],
        'token' => pista_api_token('search', 'g:' . hash('sha256', $guest_ip), $claims),
    ]);
}

$conn->close();
?>
