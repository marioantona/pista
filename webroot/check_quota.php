<?php
require_once __DIR__ . '/session.php';
header('Content-Type: application/json');

require_once __DIR__ . '/configure.php';
require_once __DIR__ . '/client_ip.php';
require_once __DIR__ . '/api_token.php';

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed.']);
    exit;
}

// cost of a full beam-search
$search_cost = 2;

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
            // Success! Deduct 2 credits from the database
            $new_quota = $row['credits_remaining'] - $search_cost;
            $update = $conn->prepare("UPDATE users SET credits_remaining = ? WHERE user_id = ?");
            $update->bind_param("ii", $new_quota, $user_id);
            $update->execute();
            
            // The credit is charged; the token is what lets Node run the search.
            echo json_encode([
                'success' => true, 'remaining' => $new_quota, 'type' => 'registered',
                'token' => pista_api_token('search', 'u:' . $user_id),
            ]);
        } else {
            // Out of quota
            echo json_encode(['success' => false, 'error' => 'You need ' . $search_cost . ' credits to search. You have ' . $row['credits_remaining'] . ' remaining. Quotas reset on the 1st of the month.']);
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
    $max_guest_credits = 2; // Limit guests to exactly 1 free search

    //Check if this IP has searched before
    $stmt = $conn->prepare('SELECT credits_remaining FROM guest_usage WHERE ip_address = ?');
    $stmt->bind_param('s', $guest_ip);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        //IP exists in database
        if ($row['credits_remaining'] >= $search_cost) {
            //Deduct search
            $new_quota = $row['credits_remaining'] - $search_cost;
            $update = $conn->prepare('UPDATE guest_usage SET credits_remaining = ? WHERE ip_address = ?');
            $update->bind_param('is', $new_quota, $guest_ip);
            $update->execute();

            echo json_encode([
                'success' => true, 'remaining' => ($new_quota), 'type' => 'guest',
                'token' => pista_api_token('search', 'g:' . hash('sha256', $guest_ip)),
            ]);
        } else {
            //IP out of free searches
            echo json_encode(['success' => false, 'error' => 'Free trial limit reached! Please Log In or Sign Up to receive 10 free monthly credits.']);
        }
    } else {
        //Set up new IP. Create a record with (Default - Cost)
        $initial_remainder = $max_guest_credits - $search_cost;
        $insert = $conn->prepare("INSERT INTO guest_usage (ip_address, credits_remaining) VALUES (?, ?)");
        $insert->bind_param("si", $guest_ip, $initial_remainder);
        $insert->execute();

        echo json_encode([
            'success' => true, 'remaining' => ($initial_remainder), 'type' => 'guest',
            'token' => pista_api_token('search', 'g:' . hash('sha256', $guest_ip)),
        ]);
    }
    $stmt->close();
}

$conn->close();
?>