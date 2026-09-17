// Request bounds for the two paid routes -- Phase 0B item 7 (RUNBOOK §17).
//
// The HMAC token proves a credit was charged. It says nothing about how much
// work the request asks for, so without these checks one legitimately minted
// token could buy an unbounded number of SerpAPI calls:
//
//   /api/verify-itinerary  one call per element of `flights`
//   /api/search-flights    main.js's predictor floors the beam width at 1 when
//                          the 20-call budget runs out, so large numDestinations
//                          or includeDestinations overspend rather than stop
//
// These bounds cap the damage. They do NOT make every in-bounds search fit 20
// calls -- 10 destinations with 10 mandatory still makes about 57. Pricing
// searches by their worst case is the follow-up item in docs/ROADMAP.md.
//
// Pure functions, no Express and no SerpAPI, so they can be tested directly.
// Error strings are static: index.js renders `error` into the page, so no
// message may ever echo request input.

// The UI allows 10 destinations and main.js appends the return leg, so a real
// itinerary has at most 11 legs. Mirrored by PISTA_MAX_ITINERARY_LEGS in
// webroot/configure.php -- change both together.
const MAX_DESTINATIONS = 10
const MAX_ITINERARY_LEGS = MAX_DESTINATIONS + 1

// daysPerLeg only shifts dates; it never changes the call count. 20 is a UX
// choice, not a cost one. Mirrored in index.html and index.js.
const MAX_DAYS_PER_LEG = 20

// Google Flights searches at most 9 passengers in total, so a larger party would
// fail at SerpAPI after the credit was charged. Confirmed 17 Sep 2026: 9+0, 8+1
// and 1+8 succeed; 10+0 and 5+5 return "Total passengers should be less than or
// equal to 9". SerpAPI's own docs do not state the limit. Mirrored in index.html, index.js
// and verify_itinerary.php.
const MAX_ADULTS = 9
const MAX_CHILDREN = 8
const MAX_PASSENGERS = 9

const IATA = /^[A-Z]{3}$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isIntIn(value, min, max) {
    return Number.isInteger(value) && value >= min && value <= max
}

// A real calendar date, not just the right shape: 2026-02-30 is refused.
function isIsoDate(value) {
    if (typeof value !== 'string' || !ISO_DATE.test(value)) return false
    const d = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

// adults/children are optional; absent means 1 adult, 0 children, as before.
function passengers(body) {
    const adults = body.adults === undefined ? 1 : body.adults
    const children = body.children === undefined ? 0 : body.children
    if (!isIntIn(adults, 1, MAX_ADULTS) || !isIntIn(children, 0, MAX_CHILDREN)
        || adults + children > MAX_PASSENGERS) return null
    return { adults, children }
}

function fail(error) {
    return { ok: false, error }
}

function validateVerifyBody(body) {
    if (!body || typeof body !== 'object') return fail('Missing or invalid flight data.')

    const { flights, region, currency } = body
    if (!Array.isArray(flights) || flights.length === 0) {
        return fail('Missing or invalid flight data.')
    }
    if (flights.length > MAX_ITINERARY_LEGS) {
        return fail(`An itinerary can have at most ${MAX_ITINERARY_LEGS} flights.`)
    }
    for (const leg of flights) {
        if (!leg || typeof leg !== 'object'
            || !Number.isInteger(leg.flight_id) || leg.flight_id < 1
            || typeof leg.from !== 'string' || !IATA.test(leg.from)
            || typeof leg.to !== 'string' || !IATA.test(leg.to)
            || !isIsoDate(leg.date)) {
            return fail('Missing or invalid flight data.')
        }
    }
    if (typeof region !== 'string' || !/^[a-z]{2}$/.test(region)) {
        return fail('Invalid region.')
    }
    if (typeof currency !== 'string' || !/^[A-Za-z]{3}$/.test(currency)) {
        return fail('Invalid currency.')
    }
    const pax = passengers(body)
    if (!pax) return fail('Invalid passenger count.')

    return {
        ok: true,
        value: {
            flights: flights.map(({ flight_id, from, to, date }) => ({ flight_id, from, to, date })),
            region,
            currency: currency.toUpperCase(),
            ...pax
        }
    }
}

function validateSearchBody(body) {
    if (!body || typeof body !== 'object') return fail('Missing required search parameters.')

    const { origin, startDate, numDestinations, daysPerLeg, includeDestinations = [] } = body
    if (origin === undefined || startDate === undefined
        || numDestinations === undefined || daysPerLeg === undefined) {
        return fail('Missing required search parameters.')
    }
    if (typeof origin !== 'string' || !IATA.test(origin)) {
        return fail('Invalid origin airport.')
    }
    if (!isIsoDate(startDate)) {
        return fail('Invalid start date.')
    }
    if (!isIntIn(numDestinations, 1, MAX_DESTINATIONS)) {
        return fail(`Destinations must be a whole number from 1 to ${MAX_DESTINATIONS}.`)
    }
    if (!isIntIn(daysPerLeg, 1, MAX_DAYS_PER_LEG)) {
        return fail(`Days per leg must be a whole number from 1 to ${MAX_DAYS_PER_LEG}.`)
    }
    if (!Array.isArray(includeDestinations)
        || includeDestinations.length > MAX_DESTINATIONS * 4 // bound the work before deduplicating
        || !includeDestinations.every(c => typeof c === 'string' && IATA.test(c))) {
        return fail('Invalid desired destinations.')
    }
    // main.js prices every mandatory destination separately, so a repeated code
    // would buy extra calls. Deduplicate before counting, and pass on the result.
    const uniqueIncludes = [...new Set(includeDestinations)]
    if (uniqueIncludes.length > numDestinations) {
        return fail('You cannot have more desired destinations than destinations.')
    }
    const pax = passengers(body)
    if (!pax) return fail('Invalid passenger count.')

    return { ok: true, value: { includeDestinations: uniqueIncludes, ...pax } }
}

module.exports = {
    MAX_DESTINATIONS,
    MAX_ITINERARY_LEGS,
    MAX_DAYS_PER_LEG,
    MAX_PASSENGERS,
    validateVerifyBody,
    validateSearchBody
}
