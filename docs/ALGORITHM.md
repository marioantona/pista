# The search algorithm

`pista-api/main.js`, `generateMultiCityItineraries()`.

## The problem

Given an origin, a start date, N destinations and a stay length, find the cheapest order to fly them
in and get home. The orderings grow factorially, and **every price lookup is a paid API call**, so
exhaustive search isn't an option. Beam search keeps only the *k* best partial routes at each hop,
trading guaranteed optimality for a cost you can predict.

Each hop expands every route in the beam in parallel. An "explore anywhere" call proposes cheap next
destinations; specific calls price any must-visit destinations still outstanding. The candidates are
deduplicated by path, filtered (avoided countries, hops under 100 km), and pruned back to the beam
width. A single batched call prices every route's flight home at the end.

## 1. Stratified beam pruning

Keeping the *k* cheapest candidates sounds right and is quietly wrong. A route heading for a
must-visit city usually costs more *now*, so it gets pruned before the constraint can pay off — and
the search ends up with cheap routes that don't satisfy what the user asked for.

So the beam is filled in strata:

- **Slots 1 … k−1:** the cheapest candidates.
- **Slot k, the "constraint survivor":** among everything not yet selected, the candidate that
  fulfils the most must-visit destinations, with ties broken by cost.
- Any slots left over take the next cheapest.

The beam always carries at least one route that is making progress on the constraints. That one
reserved slot is the most valuable design decision in the codebase.

*A bug worth mentioning:* the duplicate guard in the cheapest-slots loop was written to but never
read, so two identical routes could both take a slot. Since a beam entry is expanded at every later
hop, each duplicate also cost real API calls. The fix was made in two places. At the source, the
duplicate call is no longer made. Structurally, candidates are unique by path before pruning. A
harness ([`tools/searchQuality.js`](../pista-api/tools/searchQuality.js)) reproduced the bug with
zero API calls and was shown failing before the fix.

## 2. The call-budget predictor — and its limit

Rather than capping calls while searching, the beam width is computed *before* searching, from the
inputs alone, so that cost is a function of what the user asked for rather than of runtime luck:

```js
// condensed from main.js
const maxBudget = 20
const reservedForReturn = 6
const d = includeDestinations.length             // must-visit destinations

const callsHopZero = 1 + d                       // explore + one per must-visit
const remainingBudget = maxBudget - reservedForReturn - callsHopZero

let maxSafeBeam = defaultBeamWidth               // a one-destination trip has no later hops
if (numDestinations > 1) {
    maxSafeBeam = Math.floor(remainingBudget / ((numDestinations - 1) * (1 + d)))
}
const beamWidth = Math.max(1, Math.min(defaultBeamWidth, maxSafeBeam))
```

**The honest part.** The 20-call ceiling holds only while `maxSafeBeam ≥ 1`. When the budget can't
fit even a beam of 1, `Math.max(1, …)` floors the width at 1 and the search runs anyway, over
budget. With *d* must-visit destinations, a search fits only when `(N − 1)(1 + d) ≤ 13 − d`.

So instead of arguing about it, I measured it.
[`tools/callBudget.js`](../pista-api/tools/callBudget.js) replaces the API wrappers with counting
stubs that are worst case by construction: explore returns many cheap candidates, every batch call
comes back short so that every repair path fires, and must-visit destinations are priced too high to
take early. It then drives the **real** `main.js` over every `(N ≤ 10, d ≤ N)` pair, with and without
a travel region. The measured count equals this closed form exactly, for all 130 combinations:

```
        min(d+1, N)                        hop 0 — always a single beam item
  + W × (N(1+d) − T(d) − min(d+1, N))      hops 1…N−1,  T(d) = d(d+1)/2
  + W   when a travel region is set and N > d   hop-0 hub-batch repair
  + 1 + W                                  return batch + repair
```

- **The worst case is 58 calls** (N = 10, d = 9, with a region). The predictor's own `1 + d` per hop
  overestimates badly, because a forced hop only prices the *unvisited* must-visits, so each later
  hop costs one fewer.
- **No search the predictor considers affordable exceeded 20 calls.** The guarantee is real inside
  its region.
- **Cost isn't monotonic in N.** With no must-visits, N = 5 costs 20 calls and N = 6 costs 16,
  because the beam narrows as N grows. The bigger search is cheaper, and worse.

**What changed because of it.** Searches are now *priced* by their measured worst case, in credits:
2 for up to 20 calls, plus 2 for each further 10. No band exceeds 10 calls per credit.
`webroot/search_cost.php` is authoritative, `search_cost.js` mirrors it so the form can show the
price live, and an automated check fails the build if the two ever disagree on any input. The signed
token carries the search's size, so a caller can't pay for one destination and run ten.

## Other mechanics

- **Regional entry.** On the first hop with a travel region set, up to seven regional hub airports
  are priced in a single batched call.
- **Beam repair.** Batched calls sometimes return fewer airports than asked for. Missing ones are
  priced individually — but only as many as needed to refill the beam.
- **Concurrency.** Every beam branch expands in parallel, and within a branch the explore and
  must-visit calls run at the same time, so wall-clock time per hop is the slowest call, not the sum.
  That simultaneity is a trade-off: the must-visit calls can't know what explore will return. Where
  the overlap is knowable in advance (the hub list is a constant), the redundant call is skipped.
- **Booking horizon.** Measured, not assumed: Google Flights returned flights at +330 days and none
  at +340. A search whose last leg falls past 330 days is refused before anyone is charged.
- **Metropolitan codes** (`LON`, `NYC`). Measured: the flight API doesn't accept them, though Google
  Flights' own site does. A known-good control call was essential, because a metro code and a date
  past the horizon fail with the same error string. Planned: expand a code to its member airports,
  which is still one batched call.
