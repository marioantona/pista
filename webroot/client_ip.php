<?php
// Central client-IP resolution. Guarded so it is safe to require from any file,
// in any order, any number of times.
//
// The body is one line. The reasoning is the reason this file exists.
//
// Apache's mod_remoteip (/etc/apache2/conf-available/pista-cloudflare.conf) has
// ALREADY replaced REMOTE_ADDR with the value of the CF-Connecting-IP header --
// but only when the request's real peer was one of Cloudflare's published
// ranges. A request arriving from anywhere else keeps its true peer address no
// matter what headers it sent. That check is the whole security property.
//
// So REMOTE_ADDR is now the only correct source, and it is trustworthy precisely
// because Apache validated it. Reading $_SERVER['HTTP_CF_CONNECTING_IP'] here
// would step around that validation and hand the caller back the raw header --
// which is client input. Before Phase 0B item 4, check_quota.php did exactly
// that, and forging the header minted a fresh guest quota identity per request.
// .claude/hooks/pista-invariants.sh now fails the build if that header is read
// anywhere in the webroot outside this file.
//
// The old code also carried a `?: $_SERVER['REMOTE_ADDR']` fallback. That read
// as a safety net and was really a failure mode: pre-mod_remoteip, REMOTE_ADDR
// was the Cloudflare edge, so a missing header would have collapsed every guest
// on earth into a single guest_usage row. There is nothing to fall back to now.

if (!function_exists('pista_client_ip')) {
    function pista_client_ip(): string
    {
        return $_SERVER['REMOTE_ADDR'] ?? '';
    }
}
?>
