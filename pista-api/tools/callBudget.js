// Worst-case SerpAPI call count per search — the basis for complexity pricing.
//
// Repo-only: this file is NOT deployed (docs/RUNBOOK.md §4). It makes NO SerpAPI
// calls and needs no key. It replaces the three api.js wrappers with counting
// stubs, then drives the REAL main.js over every (N ≤ 10, d ≤ N) pair.
//
// Why stubs on the module object rather than a refactor of main.js: main.js
// destructures `require('./api')` at load time, so mutating that module's exports
// BEFORE requiring main.js is enough — the require cache hands both files the same
// object. The algorithm under test is untouched.
//
// Worst case, deliberately:
//   - explore returns many cheap candidates, so the beam always fills;
//   - every batch call returns nothing, so every repair path fires;
//   - mandatory destinations are priced far above the explore candidates, so they
//     are never picked early and the "panic mode" hops are pushed as late as
//     possible, which is what makes the tail expensive.
//
// The expected closed form (docs/ROADMAP.md, RUNBOOK §11), with T(d) = d(d+1)/2:
//
//         min(d+1, N)                       hop 0 — always a single beam item
//   + W × (N(1+d) − T(d) − min(d+1, N))     hops 1…N−1
//   + W   if a travel region is set and N > d   hop-0 hub-batch repair
//   + 1 + W                                 return batch + repair
//
// Usage: node tools/callBudget.js [--verbose]

const path = require('path')
const API_DIR = path.join(__dirname, '..')

const MAX_DESTINATIONS = 10
const DEFAULT_BEAM_WIDTH = 3
const MAX_BUDGET = 20
const RESERVED_FOR_RETURN = 6

// A region whose countries and hubs both exist in main.js's tables.
const TEST_REGION = 'north_america'
// main.js does not export regionHubs, so the one list this harness needs is mirrored.
// If they ever disagree the overlap mode simply tests less, never more.
const regionHubs = { north_america: ['JFK', 'LAX', 'YYZ', 'MEX', 'ORD', 'ATL', 'YVR'] }
const TEST_COUNTRY = 'United States'
const ORIGIN = 'LHR'

// Codes the stub invents for explore results. Deliberately not real IATA codes and
// never a regionHubs entry, so they cannot collide with a hub or a mandatory code.
const EXPLORE_CODES = Array.from({ length: 40 }, (_, i) => `X${String(i).padStart(2, '0')}`)
// Mandatory destinations: real codes in TEST_REGION, none of them regionHubs entries.
const MANDATORY_POOL = ['SFO', 'SEA', 'BOS', 'MIA', 'DEN', 'PHX', 'IAD', 'SAN', 'AUS', 'MSP']

// ...which is exactly the case this harness could not see. Because no mandatory code
// was ever a hub, the hop-0 overlap between the hub batch and the mandatory-destination
// calls was never exercised -- and that overlap was both a wasted call and the source
// of duplicate itineraries (Phase 0C session 4, tools/searchQuality.js). The third
// mode below draws mandatory destinations from the region's OWN hubs, maximising the
// overlap, and asserts the same formula still bounds it.
const HUB_POOL = [...regionHubs[TEST_REGION], ...MANDATORY_POOL]

// Mandatory destinations must stay expensive whichever pool they came from, or the
// beam takes one early and the expensive tail never happens.
let currentMandatory = new Set()

let counts = { explore: 0, single: 0, batch: 0 }
const total = () => counts.explore + counts.single + counts.batch

const api = require(path.join(API_DIR, 'api.js'))

// Far from LHR, so main.js's MIN_DISTANCE_KM filter keeps them.
const GPS = { latitude: 40.64, longitude: -73.78 }

api.fetchExploreDestinations = async () => {
    counts.explore++
    return EXPLORE_CODES.map((code, i) => ({
        destination_airport: { code },
        flight_price: 50 + i,          // cheap: these win every pruning contest
        country: TEST_COUNTRY,
        gps_coordinates: GPS,
        airline: 'TestAir',
        airline_code: 'TA'
    }))
}

api.fetchReturnFlight = async (_from, to) => {
    counts.single++
    // Mandatory destinations are expensive, so the beam never takes one early.
    const price = currentMandatory.has(to) ? 100000 : 200
    return { price, airline: 'TestAir', airline_logo: '' }
}

api.fetchBatchFlights = async () => {
    counts.batch++
    return []                          // batch starvation: forces every repair path
}

// main.js must be required AFTER the stubs are installed.
const { generateMultiCityItineraries } = require(path.join(API_DIR, 'main.js'))

// main.js's predictor, reproduced so the formula can be evaluated here.
function beamWidth(n, d) {
    const callsHopZero = 1 + d
    const remaining = MAX_BUDGET - RESERVED_FOR_RETURN - callsHopZero
    let maxSafe = DEFAULT_BEAM_WIDTH
    if (n > 1) maxSafe = Math.floor(remaining / ((n - 1) * (1 + d)))
    return Math.max(1, Math.min(DEFAULT_BEAM_WIDTH, maxSafe))
}

function formula(n, d, withRegion) {
    const W = beamWidth(n, d)
    const T = (d * (d + 1)) / 2
    const c0 = Math.min(d + 1, n)
    const hops = n * (1 + d) - T              // Σ over hops of min(d+1, N−h)
    const hubRepair = withRegion && n > d ? W : 0
    return c0 + W * (hops - c0) + hubRepair + 1 + W
}

async function run(n, d, mode) {
    counts = { explore: 0, single: 0, batch: 0 }
    const pool = mode === 'hubOverlap' ? HUB_POOL : MANDATORY_POOL
    const includeDestinations = pool.slice(0, d)
    currentMandatory = new Set(includeDestinations)
    await generateMultiCityItineraries(
        ORIGIN, '2026-10-01', n, 3, [], includeDestinations, false,
        'uk', 'GBP', 1, 0, mode === 'any' ? 'any' : TEST_REGION
    )
    return total()
}

;(async () => {
    const verbose = process.argv.includes('--verbose')
    const rows = []
    let violations = 0
    let worst = { calls: 0 }

    for (const mode of ['any', 'region', 'hubOverlap']) {
        const withRegion = mode !== 'any'
        for (let n = 1; n <= MAX_DESTINATIONS; n++) {
            for (let d = 0; d <= n; d++) {
                const measured = await run(n, d, mode)
                const bound = formula(n, d, withRegion)
                const ok = measured <= bound
                if (!ok) violations++
                if (measured > worst.calls) worst = { calls: measured, n, d, mode }
                rows.push({ n, d, mode, withRegion, measured, bound, W: beamWidth(n, d), ok })
            }
        }
    }

    const show = verbose ? rows : rows.filter(r => !r.ok || r.measured >= 20)
    console.log('mode            N   d   W  measured  formula  ok')
    for (const r of show) {
        console.log(
            `${r.mode.padEnd(14)} ${String(r.n).padStart(2)}  ${String(r.d).padStart(2)}  ${r.W}  ${String(r.measured).padStart(8)}  ${String(r.bound).padStart(7)}  ${r.ok ? 'yes' : 'NO'}`
        )
    }
    if (!verbose) console.log('(rows with fewer than 20 calls hidden; --verbose shows all)')

    console.log(`\n${rows.length} combinations, ${violations} over the formula.`)
    console.log(`Worst measured: ${worst.calls} calls at N=${worst.n}, d=${worst.d}, mode=${worst.mode}.`)

    // Does an in-budget search (the predictor thinks it fits) ever exceed 20?
    const overTwenty = rows.filter(r => beamWidth(r.n, r.d) > 0 && r.measured > MAX_BUDGET
        && Math.floor((MAX_BUDGET - RESERVED_FOR_RETURN - (1 + r.d)) / Math.max(1, (r.n - 1) * (1 + r.d))) >= 1)
    console.log(overTwenty.length === 0
        ? 'No search the predictor considers affordable exceeded 20 calls.'
        : `Predictor-affordable searches exceeding 20 calls: ${overTwenty.map(r => `N=${r.n},d=${r.d}:${r.measured}`).join(' ')}`)

    process.exit(violations ? 1 : 0)
})()
