<?php
require_once __DIR__ . '/session.php';
header('Content-Type: application/json');

require_once __DIR__ . '/configure.php';
require_once __DIR__ . '/client_ip.php';
require_once __DIR__ . '/api_token.php';
require_once __DIR__ . '/search_cost.php';

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed.']);
    exit;
}

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
if (isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];

    //check currenct quota
    $stmt = $conn->prepare("SELECT credits_remaining FROM users WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        if ($row['credits_remaining'] >= $search_cost) {
            // Success! Deduct this search's price from the database
            $new_quota = $row['credits_remaining'] - $search_cost;
            $update = $conn->prepare("UPDATE users SET credits_remaining = ? WHERE user_id = ?");
            $update->bind_param("ii", $new_quota, $user_id);
            $update->execute();

            // The credits are charged; the token is what lets Node run the search,
            // and its n/d claims cap how big that search may be.
            echo json_encode([
                'success' => true, 'remaining' => $new_quota, 'type' => 'registered',
                'cost' => $search_cost, 'calls' => $cost['calls'],
                'token' => pista_api_token('search', 'u:' . $user_id, $claims),
            ]);
        } else {
            // Out of quota
            echo json_encode(['success' => false, 'error' => 'This search costs ' . $search_cost . ' credits. You have ' . $row['credits_remaining'] . ' remaining. Quotas reset on the 1st of the month.']);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'User account not found.']);
    }
    $stmt->close();
}
// GUEST USER LOGIC (IP TRACKING)
else {
    // The real client IP, as validated by mod_remoteip rather than asserted by the
    // caller. See client_ip.php for why reading CF-Connecting-IP here would undo it.
    $guest_ip = pista_client_ip();
    $max_guest_credits = 2; // Limit guests to exactly 1 basic search

    //Check if this IP has searched before
    $stmt = $conn->prepare('SELECT credits_remaining FROM guest_usage WHERE ip_address = ?');
    $stmt->bind_param('s', $guest_ip);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();

    // A guest starts with exactly the base price, so any search that costs more is
    // out of reach however many rows exist. Say so plainly instead of "limit reached".
    $guest_credits = $row ? (int) $row['credits_remaining'] : $max_guest_credits;

    if ($guest_credits < $search_cost) {
        $error = $search_cost > $max_guest_credits
            ? 'This search costs ' . $search_cost . ' credits because of its size. Guests get ' . $max_guest_credits . '. Log in or sign up for 10 free monthly credits.'
            : 'Free trial limit reached! Please Log In or Sign Up to receive 10 free monthly credits.';
        echo json_encode(['success' => false, 'error' => $error]);
        $conn->close();
        exit;
    }

    $new_quota = $guest_credits - $search_cost;
    if ($row) {
        $update = $conn->prepare('UPDATE guest_usage SET credits_remaining = ? WHERE ip_address = ?');
        $update->bind_param('is', $new_quota, $guest_ip);
        $update->execute();
    } else {
        //Set up new IP. Create a record with (Default - Cost)
        $insert = $conn->prepare("INSERT INTO guest_usage (ip_address, credits_remaining) VALUES (?, ?)");
        $insert->bind_param("si", $guest_ip, $new_quota);
        $insert->execute();
    }

    echo json_encode([
        'success' => true, 'remaining' => $new_quota, 'type' => 'guest',
        'cost' => $search_cost, 'calls' => $cost['calls'],
        'token' => pista_api_token('search', 'g:' . hash('sha256', $guest_ip), $claims),
    ]);
}

$conn->close();
?>
