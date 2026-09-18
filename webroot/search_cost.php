<?php
// What a search costs, in credits — Phase 0B, complexity pricing (RUNBOOK §12).
//
// AUTHORITATIVE. This is what check_quota.php charges. search_cost.js mirrors it
// for the price shown in the form; the invariant hook fails the build if the two
// ever disagree on any (n, d) pair.
//
// A search's cost is its WORST-CASE SerpAPI call count, which is decided entirely
// by the number of destinations (n) and of mandatory destinations (d), before the
// search runs. It cannot be the calls actually made: PHP charges first and Node,
// which does the calling, has no database.
//
//   calls = min(d+1, n)                        hop 0 — always a single beam item
//         + W × (n(1+d) − T(d) − min(d+1, n))  hops 1…n−1
//         + W   when n > d                     hop-0 hub-batch repair (travel region set)
//         + 1 + W                              return batch + repair
//
// with T(d) = d(d+1)/2 and W the beam width main.js's predictor picks. The hub
// term is always included, so the price does not depend on the travel region —
// at most 3 calls of headroom, in exchange for a price that depends only on n
// and d, which is what the token binds.
//
// Verified against the real main.js by pista-api/tools/callBudget.js: measured
// equals this formula for all 130 (n, d, region) combinations, worst case 58.
//
// Banding: 2 credits up to 20 calls, then 2 more per 10 calls. Every band stays
// at no more than 10 calls per credit, so 10 monthly credits cap a user at about
// 100 calls however they search.

if (!defined('PISTA_SEARCH_MAX_BUDGET')) {
    define('PISTA_SEARCH_MAX_BUDGET', 20);       // calls covered by the base price
    define('PISTA_SEARCH_BASE_CREDITS', 2);      // what a search has always cost
    define('PISTA_SEARCH_CALLS_PER_BAND', 10);
    define('PISTA_SEARCH_CREDITS_PER_BAND', 2);

    // Google Flights sells about 11 months ahead. Measured 18 September 2026 on
    // LHR→CDG: flights at +320 and +330 days, none at +340. Set at the last
    // offset that returned flights. A heuristic, not a promise — schedules differ
    // by airline, so a date inside this window can still come back empty.
    // Mirrored by MAX_HORIZON_DAYS in pista-api/requestLimits.js and by
    // search_cost.js for the browser.
    define('PISTA_MAX_HORIZON_DAYS', 330);
}

if (!function_exists('pista_search_cost')) {

    // main.js's budget predictor, reproduced. Keep in step with main.js.
    function pista_search_beam_width(int $n, int $d): int
    {
        $remaining = 20 - 6 - (1 + $d);          // maxBudget − reservedForReturn − hop 0
        $maxSafe = 3;                            // defaultBeamWidth
        if ($n > 1) {
            $maxSafe = (int) floor($remaining / (($n - 1) * (1 + $d)));
        }
        return max(1, min(3, $maxSafe));
    }

    /**
     * @return array{calls:int,credits:int} worst-case calls and the price in credits.
     */
    function pista_search_cost(int $n, int $d): array
    {
        $w  = pista_search_beam_width($n, $d);
        $t  = ($d * ($d + 1)) / 2;
        $c0 = min($d + 1, $n);
        $hops = $n * (1 + $d) - $t;
        $calls = $c0 + $w * ($hops - $c0) + ($n > $d ? $w : 0) + 1 + $w;

        $over = max(0, $calls - PISTA_SEARCH_MAX_BUDGET);
        $credits = PISTA_SEARCH_BASE_CREDITS
            + PISTA_SEARCH_CREDITS_PER_BAND * (int) ceil($over / PISTA_SEARCH_CALLS_PER_BAND);

        return ['calls' => (int) $calls, 'credits' => (int) $credits];
    }
}
?>
