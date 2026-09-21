// Search quality: no duplicate itineraries, and no leg bought twice.
//
// Repo-only: this file is NOT deployed (docs/RUNBOOK.md §4). It makes NO SerpAPI
// calls and needs no key. It uses the same technique as tools/callBudget.js --
// replace the three api.js exports with stubs BEFORE requiring main.js, so the
// require cache hands both files the same object -- which means the REAL
// algorithm runs, untouched, over scripted data.
//
// The case under test is the one callBudget.js deliberately avoids. Its
// MANDATORY_POOL is documented as containing no regionHubs entries, so the
// overlap between the hop-0 hub batch and the mandatory-destination calls was
// never exercised: the hub batch prices FCO, and the specific branch prices FCO
// again, in parallel, on the same day, from the same engine. That bought the same
// leg twice AND produced two candidates with an identical path -- which the
// stratified pruning then failed to collapse, because its cheapest-slots loop
// writes addedPaths without ever reading it (Phase 0C session 4).

const path = require('path')
const API_DIR = path.join(__dirname, '..')

const ORIGIN = 'LHR'
const REGION = 'mediterranean'          // hubs: BCN FCO ATH MLA IST PMI AGP
const MANDATORY_HUB = 'FCO'             // a mandatory destination that IS a hub
const START = '2026-10-01'

// Cheap, so the duplicate pair sorts into the cheapest slots; every other hub is
// expensive, so nothing else can displace it.
const HUB_PRICE = { [MANDATORY_HUB]: 100 }
const OTHER_HUB_PRICE = 500

// Explore candidates for hops past 0. Italy is inside the mediterranean fence.
// MANDATORY_HUB is in the list deliberately: explore can return a destination the
// mandatory branch is pricing at the same moment, which is the OTHER way an
// identical path gets built -- and there the two prices come from two different
// engines, so the tie-break decides which one the user is shown.
const EXPLORE_CODES = [MANDATORY_HUB, 'NAP', 'VCE', 'PMO', 'CTA', 'BRI']
const EXPLORE_PRICE_OF_HUB = 90          // explore's estimate: cheaper, less authoritative
const GPS = { latitude: 41.8, longitude: 12.25 }   // well past MIN_DISTANCE_KM from LHR

const api = require(path.join(API_DIR, 'api.js'))

let calls = []
const reset = () => { calls = [] }
// Scoped to the hop-0 pair deliberately. A later single call to the same code
// from a DIFFERENT airport (BCN->FCO at hop 1, for a beam entry that went to BCN
// first) is legitimate work, not the redundancy under test.
const singleCalls = (from, to) => calls.filter(c => c.kind === 'single' && c.from === from && c.to === to).length

let starveBatch = false

api.fetchExploreDestinations = async (from) => {
    calls.push({ kind: 'explore', from })
    return EXPLORE_CODES.map((code, i) => ({
        destination_airport: { code },
        flight_price: code === MANDATORY_HUB ? EXPLORE_PRICE_OF_HUB : 300 + i,
        country: 'Italy',
        gps_coordinates: GPS,
        airline: 'TestAir',
        airline_code: 'TA'
    }))
}

api.fetchReturnFlight = async (from, to) => {
    calls.push({ kind: 'single', from, to })
    // Deliberately the SAME price the hub batch quotes, because both wrappers ask
    // google_flights for the cheapest fare on the same pair on the same date. That
    // is why the duplicate is byte-identical rather than merely similar.
    const price = HUB_PRICE[to] ?? OTHER_HUB_PRICE
    return { price, airline: 'TestAir', airline_logo: '' }
}

api.fetchBatchFlights = async (originsStr, destinationsStr) => {
    calls.push({ kind: 'batch', from: originsStr, to: destinationsStr })
    if (starveBatch) return []          // Google omitted everything we asked for
    const origins = originsStr.split(',')
    const dests = destinationsStr.split(',')
    // The return batch: one origin per beam endpoint, all heading home.
    if (dests.length === 1 && dests[0] === ORIGIN) {
        return origins.map(from => ({
            from, to: ORIGIN, price: 150, airline: 'TestAir', airline_logo: ''
        }))
    }
    // The hop-0 hub batch.
    return dests.map(to => ({
        from: origins[0], to, price: HUB_PRICE[to] ?? OTHER_HUB_PRICE,
        airline: 'TestAir', airline_logo: ''
    }))
}

// main.js must be required AFTER the stubs are installed.
const { generateMultiCityItineraries } = require(path.join(API_DIR, 'main.js'))

function search(n, includeDestinations, region = REGION) {
    reset()
    return generateMultiCityItineraries(
        ORIGIN, START, n, 3, [], includeDestinations, false,
        'uk', 'GBP', 1, 0, region
    )
}

const failures = []
function check(name, ok, detail) {
    console.log(`${ok ? '  ok  ' : '  FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
    if (!ok) failures.push(name)
}

function pathsOf(itins) { return itins.map(i => i.path.join('>')) }
function duplicatesIn(list) {
    const seen = new Set(), dupes = new Set()
    for (const p of list) { if (seen.has(p)) dupes.add(p); seen.add(p) }
    return [...dupes]
}

;(async () => {
    console.log('\n1. A mandatory destination that is also a regional hub')
    starveBatch = false
    let itins = await search(2, [MANDATORY_HUB])
    let paths = pathsOf(itins)
    let dupes = duplicatesIn(paths)
    check('no two itineraries share a path', dupes.length === 0,
        dupes.length ? `duplicated: ${dupes.join(' | ')}` : `${paths.length} itineraries, all distinct`)
    check(`the hub batch covers ${MANDATORY_HUB}, so hop 0 makes no separate call for it`,
        singleCalls(ORIGIN, MANDATORY_HUB) === 0,
        `${singleCalls(ORIGIN, MANDATORY_HUB)} × ${ORIGIN}->${MANDATORY_HUB}`)
    check('a duplicate beam entry is not expanded twice',
        calls.filter(c => c.kind === 'explore').length
            === new Set(calls.filter(c => c.kind === 'explore').map(c => c.from)).size,
        `${calls.filter(c => c.kind === 'explore').length} explore call(s) from ` +
        `${new Set(calls.filter(c => c.kind === 'explore').map(c => c.from)).size} distinct airport(s)`)
    check(`${MANDATORY_HUB} still reaches the results`,
        paths.some(p => p.includes(MANDATORY_HUB)), paths[0])

    console.log('\n2. The same, with the hub batch starved (Google omits every hub)')
    starveBatch = true
    itins = await search(2, [MANDATORY_HUB])
    paths = pathsOf(itins)
    check(`${ORIGIN}->${MANDATORY_HUB} is fetched once, by repair, not twice`,
        singleCalls(ORIGIN, MANDATORY_HUB) === 1,
        `${singleCalls(ORIGIN, MANDATORY_HUB)} × ${ORIGIN}->${MANDATORY_HUB}`)
    check(`${MANDATORY_HUB} is recovered by beam repair`,
        paths.some(p => p.includes(MANDATORY_HUB)),
        paths.length ? paths.join(' | ') : 'no itineraries at all')
    check('no two itineraries share a path (starved)', duplicatesIn(paths).length === 0,
        duplicatesIn(paths).join(' | ') || 'all distinct')

    console.log('\n3. Uniqueness across a spread of (N, d)')
    starveBatch = false
    const hubs = ['FCO', 'ATH', 'BCN']
    for (const [n, d] of [[2, 0], [2, 1], [3, 1], [3, 2], [4, 1], [5, 2]]) {
        itins = await search(n, hubs.slice(0, d))
        const dd = duplicatesIn(pathsOf(itins))
        check(`N=${n} d=${d}`, dd.length === 0, dd.join(' | ') || `${itins.length} itineraries`)
    }

    console.log('\n4. Explore returns a destination the mandatory branch is also pricing')
    // No region, so no hub bypass: the collision is purely explore vs the specific
    // call, at two different prices from two different engines.
    starveBatch = false
    itins = await search(2, [MANDATORY_HUB], 'any')
    paths = pathsOf(itins)
    check('no two itineraries share a path', duplicatesIn(paths).length === 0,
        duplicatesIn(paths).join(' | ') || `${paths.length} itineraries, all distinct`)
    const hubLeg = itins
        .flatMap(i => i.flights)
        .find(f => f.from === ORIGIN && f.to === MANDATORY_HUB)
    check('the surviving candidate keeps the google_flights price, not explore\'s estimate',
        !!hubLeg && hubLeg.price === HUB_PRICE[MANDATORY_HUB],
        hubLeg ? `${ORIGIN}->${MANDATORY_HUB} priced ${hubLeg.price} (flights ${HUB_PRICE[MANDATORY_HUB]}, explore ${EXPLORE_PRICE_OF_HUB})` : 'leg not found')
    check('no itinerary still carries the internal source tag',
        itins.every(i => i.source === undefined), 'source stripped from the response')

    console.log('\n5. No travel region, no mandatory destination: the plain path is unchanged')
    itins = await search(2, [], 'any')
    check('still returns itineraries with a distinct path each',
        itins.length > 0 && duplicatesIn(pathsOf(itins)).length === 0,
        `${itins.length} itineraries`)

    console.log(failures.length
        ? `\n${failures.length} failing check(s): ${failures.join('; ')}`
        : '\nAll checks passed.')
    process.exit(failures.length ? 1 : 0)
})()
