// What a search costs, for the price shown in the form — Phase 0B, complexity pricing.
//
// A MIRROR of webroot/search_cost.php, which is authoritative: PHP decides what is
// actually charged, and never trusts a cost sent by the browser. This copy exists so
// the form can price a search live, without a request per keystroke. The invariant
// hook runs both over every (n, d) pair and fails the build if they disagree.
//
// The reasoning behind the formula, and the measurement that confirms it, are in
// search_cost.php and docs/RUNBOOK.md §12. Keep the two in step.
//
// Loaded as a classic script before index.js, so it publishes window.PISTA_COST.
// It also exports under CommonJS, which is how the parity check loads it.

(function (root) {
    const MAX_BUDGET = 20;          // calls covered by the base price
    const BASE_CREDITS = 2;
    const CALLS_PER_BAND = 10;
    const CREDITS_PER_BAND = 2;

    // Measured 18 September 2026: LHR→CDG had flights at +330 days, none at +340.
    // Mirrors PISTA_MAX_HORIZON_DAYS (PHP) and MAX_HORIZON_DAYS (requestLimits.js).
    const MAX_HORIZON_DAYS = 330;

    // main.js's budget predictor.
    function beamWidth(n, d) {
        const remaining = 20 - 6 - (1 + d);
        let maxSafe = 3;
        if (n > 1) maxSafe = Math.floor(remaining / ((n - 1) * (1 + d)));
        return Math.max(1, Math.min(3, maxSafe));
    }

    // -> { calls, credits }
    function searchCost(n, d) {
        const w = beamWidth(n, d);
        const t = (d * (d + 1)) / 2;
        const c0 = Math.min(d + 1, n);
        const hops = n * (1 + d) - t;
        const calls = c0 + w * (hops - c0) + (n > d ? w : 0) + 1 + w;

        const over = Math.max(0, calls - MAX_BUDGET);
        const credits = BASE_CREDITS + CREDITS_PER_BAND * Math.ceil(over / CALLS_PER_BAND);
        return { calls, credits };
    }

    // Days from today to the last date a search touches: startDate + n × daysPerLeg.
    // Compared in whole UTC days so a timezone offset cannot shift the answer.
    function daysToLastLeg(startDate, n, daysPerLeg) {
        const start = Date.parse(`${startDate}T00:00:00Z`);
        if (Number.isNaN(start)) return null;
        const today = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
        const last = start + n * daysPerLeg * 86400000;
        return Math.round((last - today) / 86400000);
    }

    const api = { searchCost, beamWidth, daysToLastLeg, MAX_HORIZON_DAYS };
    root.PISTA_COST = api;
    if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
