<?php
// X-PISTA-Token minting -- the PHP half of the HMAC handshake (RUNBOOK §17).
// Guarded so it is safe to require from any file, any number of times.
//
// PHP mints only; pista-api/apiToken.js verifies. A token is issued AFTER a
// credit has been charged, so Node runs work only for requests someone paid for.
// Before this, anyone could POST straight to /api/search-flights and run a full
// beam search without ever visiting check_quota.php.
//
//   v1.<base64url(payload)>.<base64url(HMAC-SHA256(secret, "v1.<base64url(payload)>"))>
//
// The MAC covers the exact string that is transmitted, so Node never has to
// reproduce PHP's JSON byte for byte. The secret is the HMAC key and never
// travels; the third segment is only the MAC.
//
// jti exists from day one: it is the natural idempotency key for the Phase 0C
// charge-on-success refund. Guest subjects are hashed, so a token that ends up
// in a log is not an IP disclosure.

require_once __DIR__ . '/env.php';

if (!function_exists('pista_api_token')) {

    function pista_base64url(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }

    // $scope: 'search' (check_quota.php) or 'verify' (verify_itinerary.php).
    // $sub:   'u:<user_id>' or 'g:<sha256(client ip)>'.
    // $extra: integer claims bound into the signature. check_quota.php sends
    //         n  = destinations paid for,
    //         d  = mandatory destinations paid for,
    //         cr = credits charged.
    //         n and d are what stop a caller paying for a small search and then
    //         running a large one: Node refuses a request exceeding them. cr is
    //         for the Phase 0C charge-on-success refund, which keys on jti and
    //         must return the amount actually taken. Integers only -- no JSON
    //         canonicalisation problem, since the MAC covers the transmitted
    //         string rather than a re-serialisation.
    function pista_api_token(string $scope, string $sub, array $extra = []): string
    {
        $iat = time();
        $claims = [
            'jti'   => bin2hex(random_bytes(16)),
            'sub'   => $sub,
            'scope' => $scope,
            'iat'   => $iat,
            'exp'   => $iat + 120, // Node rejects anything longer-lived
        ];
        foreach ($extra as $key => $value) {
            if (is_int($value)) {
                $claims[$key] = $value;
            }
        }
        $payload = json_encode($claims);

        $signing_input = 'v1.' . pista_base64url($payload);
        $mac = hash_hmac('sha256', $signing_input, $_ENV['PISTA_API_SECRET'], true);

        return $signing_input . '.' . pista_base64url($mac);
    }
}
?>
