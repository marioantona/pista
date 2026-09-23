const { fetchExploreDestinations, fetchReturnFlight, fetchBatchFlights } = require('./api')
const airportDatabase = require('./airports.json')

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

function getDistanceInKm(lat1, lon1, lat2, lon2) {
    const R = 6371
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

function getAirportData(iataCode) {
    return airportDatabase[iataCode] || null
}


// --- Helper Date Function ---
function addDaysToDate(dateString, days) {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

// Maps travel regions to up to 7 major aviation hubs for batch routing
const regionHubs = {
    "any": "any",
    "mediterranean": ["BCN", "FCO", "ATH", "MLA", "IST", "PMI", "AGP"],
    "western_europe": ["CDG", "AMS", "FRA", "BRU", "ZRH", "GVA", "DUB"],
    "eastern_europe": ["WAW", "PRG", "BUD", "OTP", "SOF", "KRK", "EVN"],
    "northern_europe": ["ARN", "CPH", "OSL", "HEL", "KEF", "BGO", "GOT"],
    "southern_europe": ["MAD", "MXP", "LIS", "ATH", "NAP", "OPO", "VCE"],
    "central_europe": ["FRA", "MUC", "VIE", "PRG", "ZRH", "BER", "WAW"],
    "balkans": ["BEG", "ATH", "OTP", "SOF", "ZAG", "SJJ", "TGD"],
    "baltics": ["RIX", "VNO", "TLL", "KUN", "PLQ", "TAY", "EPU"],
    "british_isles": ["LHR", "DUB", "EDI", "MAN", "GLA", "BFS", "BRS"],
    "north_america": ["JFK", "LAX", "YYZ", "MEX", "ORD", "ATL", "YVR"],
    "central_america": ["PTY", "SJO", "SAL", "GUA", "BZE", "LIR", "MGA"],
    "caribbean": ["PUJ", "SJU", "CUN", "MBJ", "BGI", "NAS", "SDQ"],
    "south_america": ["GRU", "BOG", "SCL", "EZE", "LIM", "GIG"],
    "southeast_asia": ["BKK", "SIN", "CGK", "KUL", "SGN", "MNL", "HAN"],
    "east_asia": ["HND", "ICN", "PEK", "HKG", "TPE", "PVG", "KIX"],
    "south_asia": ["DEL", "BOM", "MLE", "CMB", "KTM", "DAC", "ISB"],
    "central_asia": ["ALA", "TAS", "FRU", "DYU", "ASB", "NQZ", "TSE"],
    "middle_east": ["DXB", "DOH", "JED", "AMM", "TLV", "AUH", "MCT"],
    "north_africa": ["CMN", "CAI", "TUN", "ALG", "RAK", "HRG", "RBA"],
    "east_africa": ["NBO", "ADD", "DAR", "EBB", "KGL", "ZNZ", "SEZ"],
    "southern_africa": ["JNB", "CPT", "MRU", "WDH", "LAD", "MPM", "HRE"],
    "west_africa": ["LOS", "ACC", "DKR", "ABJ", "FNA", "BJM", "OUA"],
    "central_africa": ["FIH", "DLA", "LBV", "SSG", "BGF", "BZV", "PNR"],
    "oceania": ["SYD", "MEL", "AKL", "BNE", "PER", "ADL", "CHC"],
    "polynesia_pacific": ["NAN", "PPT", "GUM", "NOU", "APW", "TBU", "HNL"]
}

// region map acts as a fence once we are in the area
const regionMap = {
    "mediterranean": ["Spain", "France", "Italy", "Greece", "Malta", "Croatia", "Cyprus", "Turkey", "Monaco", "Albania", "Montenegro", "Bosnia and Herzegovina", "Slovenia", "Lebanon", "Egypt", "Tunisia", "Algeria", "Morocco"],
    "western_europe": ["United Kingdom", "Ireland", "France", "Netherlands", "Belgium", "Luxembourg", "Germany", "Switzerland", "Austria"],
    "eastern_europe": ["Poland", "Czechia", "Slovakia", "Hungary", "Romania", "Bulgaria", "Moldova", "Ukraine", "Belarus", "Estonia", "Latvia", "Lithuania"],
    "northern_europe": ["Sweden", "Norway", "Denmark", "Finland", "Iceland", "Greenland", "Faroe Islands"],
    "southern_europe": ["Portugal", "Spain", "Italy", "Greece", "Malta", "San Marino", "Andorra", "North Macedonia", "Serbia"],
    "central_europe": ["Germany", "Poland", "Czechia", "Slovakia", "Hungary", "Austria", "Switzerland", "Liechtenstein"],
    "balkans": ["Croatia", "Bosnia and Herzegovina", "Serbia", "Montenegro", "Kosovo", "Albania", "North Macedonia", "Bulgaria", "Romania", "Greece"],
    "baltics": ["Estonia", "Latvia", "Lithuania"],
    "british_isles": ["United Kingdom", "Ireland", "Isle of Man", "Guernsey", "Jersey"],
    "north_america": ["United States", "Canada", "Mexico", "Greenland", "Bermuda"],
    "central_america": ["Belize", "Costa Rica", "El Salvador", "Guatemala", "Honduras", "Nicaragua", "Panama"],
    "caribbean": ["Cuba", "Dominican Republic", "Jamaica", "Bahamas", "Puerto Rico", "Haiti", "Barbados", "Trinidad and Tobago", "Cayman Islands", "Aruba"],
    "south_america": ["Brazil", "Argentina", "Chile", "Colombia", "Peru", "Ecuador", "Venezuela", "Uruguay", "Paraguay", "Bolivia", "Guyana", "Suriname"],
    "southeast_asia": ["Thailand", "Vietnam", "Malaysia", "Indonesia", "Philippines", "Singapore", "Cambodia", "Laos", "Myanmar", "Brunei"],
    "east_asia": ["Japan", "South Korea", "China", "Taiwan", "Hong Kong", "Macau", "Mongolia", "North Korea"],
    "south_asia": ["India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal", "Maldives", "Bhutan", "Afghanistan"],
    "central_asia": ["Kazakhstan", "Uzbekistan", "Kyrgyzstan", "Tajikistan", "Turkmenistan"],
    "middle_east": ["United Arab Emirates", "Saudi Arabia", "Qatar", "Oman", "Kuwait", "Bahrain", "Israel", "Jordan", "Lebanon", "Turkey", "Egypt", "Iran", "Iraq", "Syria", "Yemen"],
    "north_africa": ["Morocco", "Algeria", "Tunisia", "Libya", "Egypt", "Sudan"],
    "east_africa": ["Kenya", "Tanzania", "Uganda", "Rwanda", "Burundi", "Ethiopia", "Somalia", "Djibouti", "Eritrea", "Madagascar", "Mauritius", "Seychelles"],
    "southern_africa": ["South Africa", "Namibia", "Botswana", "Zimbabwe", "Mozambique", "Zambia", "Malawi", "Lesotho", "Eswatini", "Angola"],
    "west_africa": ["Nigeria", "Ghana", "Cote d'Ivoire", "Senegal", "Mali", "Burkina Faso", "Guinea", "Liberia", "Sierra Leone", "Togo", "Benin", "Gambia", "Cape Verde"],
    "central_africa": ["Democratic Republic of the Congo", "Cameroon", "Central African Republic", "Chad", "Republic of the Congo", "Gabon", "Equatorial Guinea", "Sao Tome and Principe"],
    "oceania": ["Australia", "New Zealand", "Papua New Guinea", "Fiji", "Vanuatu", "Solomon Islands", "Samoa", "Tonga"],
    "polynesia_pacific": ["French Polynesia", "Fiji", "Samoa", "Tonga", "Vanuatu", "New Caledonia", "Guam", "Micronesia"]
}

// --- Core Beam Search Algorithm ---

async function generateMultiCityItineraries(origin, startDate, numDestinations, daysPerLeg, avoidCountries = [], includeDestinations = [], avoidOriginCountry = false, region = 'uk', currency = 'GBP', adults = 1, children = 0, travelRegion = "any", defaultBeamWidth = 3) {
    
    const originData = getAirportData(origin)
    if (!originData) throw new Error(`Origin airport ${origin} not found in database.`)
    
    if (avoidOriginCountry) {
        avoidCountries.push(originData.country)
    }
    
    const MIN_DISTANCE_KM = 100

    // Set when a SerpAPI call itself fails, as opposed to returning nothing usable.
    // An empty candidate pool then means "the provider is down", not "your
    // constraints are too strict" -- the difference between our fault and the
    // user's, and the difference between a refund and a lesson (Phase 0C).
    let upstreamFailed = false

    //API CALL PREDICTOR & BEAM THROTTLE
    const maxBudget = 20
    const reservedForReturn = 6
    const d = includeDestinations.length

    const callsHopZero = 1 + d
    const remainingBudget = maxBudget - reservedForReturn - callsHopZero

    let maxSafeBeam = defaultBeamWidth

    if (numDestinations > 1) {
        const callsPerBeamItem = 1 + d
        const subsequentHops = numDestinations - 1

        maxSafeBeam = Math.floor(remainingBudget / (subsequentHops * callsPerBeamItem))
    }

    const beamWidth = Math.max(1, Math.min(defaultBeamWidth, maxSafeBeam))

    console.log(`[PREDICTOR] Target Dests ${numDestinations} | Mandatory: ${d}`)
    console.log(`[PREDICTOR] Dynamic Beam Width set to: ${beamWidth}`)


    // Initialize the beam with our starting point
    let beam = [{
        path: [origin],
        dates: [],
        totalCost: 0,
        flights: []
    }];

    // Step 1 to N: Loop through each required destination hop
    for (let hop = 0; hop < numDestinations; hop++) {
        const currentDate = addDaysToDate(startDate, hop * daysPerLeg)

        // 🚀 OPTIMIZATION: Process all itineraries in the beam AT THE SAME TIME
        const hopPromises = beam.map(async (itinerary) => {
            const currentAirport = itinerary.path[itinerary.path.length - 1]
            const unvisitedMandatory = includeDestinations.filter(dest => !itinerary.path.includes(dest))
            const hopsRemaining = numDestinations - hop
            const mustVisitMandatory = unvisitedMandatory.length >= hopsRemaining

            let localCandidates = []

            if (mustVisitMandatory) {
                // 🛑 PANIC MODE: Only use api2 to fly directly to a mandatory destination
                const panicPromises = unvisitedMandatory.map(async (targetDest) => {
                    try {
                        console.log(`[FORCED HOP] Checking specific route: ${currentAirport} -> ${targetDest}`);
                        const specificFlight = await fetchReturnFlight(currentAirport, targetDest, currentDate, region, currency, adults, children);
                        return {
                            path: [...itinerary.path, targetDest],
                            dates: [...itinerary.dates, currentDate],
                            totalCost: itinerary.totalCost + specificFlight.price,
                            source: 'flights',
                            flights: [...itinerary.flights, {
                                from: currentAirport,
                                to: targetDest,
                                price: specificFlight.price,
                                airline: specificFlight.airline,
                                airline_logo: specificFlight.airline_logo
                            }]
                        };
                    } catch (error) {
                        console.log(`⚠️ Warning: Forced flight ${currentAirport} -> ${targetDest} failed.`);
                        return null; // Return null if flight fails
                    }
                });
                
                // Wait for all panic routes to finish
                const panicResults = await Promise.all(panicPromises);
                localCandidates.push(...panicResults.filter(r => r !== null));

            } else {
                // 🟢 FLOATING LOGIC: Explore AND check mandatory destinations simultaneously!

                // Which hubs the hop-0 batch will price is worked out HERE, outside
                // the promise, because the mandatory-destination branch below is
                // fired at the same instant and has to know what the batch already
                // covers. That is only possible because regionHubs is a hardcoded
                // constant -- no round trip is needed to answer it (Phase 0C s4).
                const useHubBypass = hop === 0 && travelRegion !== "any" && !!regionHubs[travelRegion]

                // Filter out already visited or avoided hubs
                const validHubs = useHubBypass
                    ? regionHubs[travelRegion].filter(hubIata => {
                        if (itinerary.path.includes(hubIata)) return false
                        const hubData = getAirportData(hubIata)
                        if (hubData && avoidCountries.includes(hubData.country)) return false
                        return true
                    }).slice(0, 7) // hard cap of 7 for API
                    : []

                // Tested against the SLICED list on purpose: a mandatory hub sitting
                // past the 7-hub cap is NOT in the batch and still needs its own call.
                const coveredByBatch = new Set(validHubs)

                // Part A: Explore Branch (Wrapped in a promise)
                const explorePromise = (async () => {
                    try {
                        // 🚀 ONLY USE Hub Bypass on Hop 0 to get them into the region!
                        if (useHubBypass) {

                            console.log(`[ENTRY HUB BYPASS] Batch checking up to 7 hubs for ${travelRegion}`)

                            if (validHubs.length === 0) return []

                            const hubsStr = validHubs.join(",")
                            const batchFlights = await fetchBatchFlights(currentAirport, hubsStr, currentDate, region, currency, adults, children)

                            let hubResults = []
                            const bestPerHub = {}

                            // Group by destination to find the cheapest flight to each specific hub
                            batchFlights.forEach(flight => {
                                if (!bestPerHub[flight.to] || flight.price < bestPerHub[flight.to].price) {
                                    bestPerHub[flight.to] = flight
                                }
                            })

                            // COMPROMISE - BEAM REPAIR LOGIC
                            const foundHubs = Object.keys(bestPerHub)
                            {
                                // Find which hubs we asked for, but Google ignored
                                const missingHubs = validHubs.filter(hub => !foundHubs.includes(hub))

                                // A mandatory destination is repaired WHENEVER the batch
                                // omitted it -- not only when the beam is short, which used
                                // to skip repair entirely once enough hubs came back. Its
                                // own call was skipped on the strength of this batch
                                // covering it, so this is what makes that skip safe, and it
                                // costs no more than the call it replaced.
                                const missingMandatory = missingHubs.filter(hub => unvisitedMandatory.includes(hub))
                                const missingOther = missingHubs.filter(hub => !unvisitedMandatory.includes(hub))

                                // Everything else still only fetches enough to fill the beam.
                                const otherSlots = Math.max(0, beamWidth - foundHubs.length - missingMandatory.length)
                                const hubsToFetch = [...missingMandatory, ...missingOther.slice(0, otherSlots)]

                                if (hubsToFetch.length > 0) {
                                    console.log(`[BEAM REPAIR] Batch starved. Fetching ${hubsToFetch.length} missing hubs individually`)

                                    const repairPromises = hubsToFetch.map(async (hub) => {
                                        try {
                                            const flight = await fetchReturnFlight(currentAirport, hub, currentDate, region, currency, adults, children)
                                            bestPerHub[hub] = {
                                                from: currentAirport,
                                                to: hub,
                                                price: flight.price,
                                                airline: flight.airline,
                                                airline_logo: flight.airline_logo
                                            }
                                        } catch (e) {
                                            // Ignore failures, route might genuinely not exist
                                        }
                                    })
                                    await Promise.all(repairPromises)
                                }
                            }
                            
                            // build resulting branches from repaired list
                            for (const hub in bestPerHub) {
                                const flight = bestPerHub[hub]
                                hubResults.push({
                                    path: [...itinerary.path, hub],
                                    dates: [...itinerary.dates, currentDate],
                                    totalCost: itinerary.totalCost + flight.price,
                                    source: 'flights',
                                    flights: [...itinerary.flights, {
                                        from: currentAirport,
                                        to: hub,
                                        price: flight.price,
                                        airline: flight.airline,
                                        airline_logo: flight.airline_logo
                                    }]
                                })
                            }
                            return hubResults
                        } else {
                            // 🟢 INTRA-REGION / ANYWHERE EXPLORE LOGIC
                            const destinations = await fetchExploreDestinations(currentAirport, currentDate, region, currency, adults, children);

                            let validDestinations = [];
                            const allowedCountries = regionMap[travelRegion] || null
                            
                            for (const dest of destinations) {
                                if (!dest.destination_airport || !dest.destination_airport.code || !dest.flight_price) continue;
                                if (avoidCountries.includes(dest.country)) continue;
                                if (itinerary.path.includes(dest.destination_airport.code)) continue;

                                // 🛑 FENCE: If they selected a region, don't let them fly out of it!
                                if (travelRegion !== "any" && allowedCountries && !allowedCountries.includes(dest.country)) {
                                    continue
                                }

                                if (dest.gps_coordinates) {
                                    const distToOrigin = getDistanceInKm(originData.lat, originData.lon, 
                                        dest.gps_coordinates.latitude, dest.gps_coordinates.longitude)
                                    
                                    if (distToOrigin < MIN_DISTANCE_KM) {
                                        console.log(`[FILTERED] Skipping ${dest.destination_airport.code} - Too close to origin`)
                                        continue;
                                    }
                                }

                                validDestinations.push({
                                    path: [...itinerary.path, dest.destination_airport.code],
                                    dates: [...itinerary.dates, currentDate],
                                    totalCost: itinerary.totalCost + dest.flight_price,
                                    source: 'explore',
                                    flights: [...itinerary.flights, {
                                        from: currentAirport,
                                        to: dest.destination_airport.code,
                                        price: dest.flight_price,
                                        airline: dest.airline,
                                        // Construct logo URL using airline code if logo is missing
                                        airline_logo: dest.airline_logo || (dest.airline_code ? `https://www.gstatic.com/flights/airline_logos/70px/${dest.airline_code}.png` : "")
                                    }]
                                });
                            }
                            return validDestinations;
                        }
                    } catch (error) {
                        console.error(`[EXPLORE API ERROR] SerpAPI failed: ${error.message}`)
                        upstreamFailed = true
                        return [];
                    }
                })();

                // Part B: Specific Mandatory Branches -- minus whatever the hop-0 hub
                // batch is already pricing. Same engine, same pair, same date, so a
                // second call would buy nothing; it would only produce a second
                // candidate with an identical path, which is where the duplicate
                // itineraries came from (Phase 0C session 4).
                const specificTargets = unvisitedMandatory.filter(dest => !coveredByBatch.has(dest))
                const specificPromises = specificTargets.map(async (targetDest) => {
                    try {
                        console.log(`[FLOATING CHECK] Checking price for early jump to: ${targetDest}`);
                        const specificFlight = await fetchReturnFlight(currentAirport, targetDest, currentDate, region, currency, adults, children);
                        return {
                            path: [...itinerary.path, targetDest],
                            dates: [...itinerary.dates, currentDate],
                            totalCost: itinerary.totalCost + specificFlight.price,
                            source: 'flights',
                            flights: [...itinerary.flights, {
                                from: currentAirport,
                                to: targetDest,
                                price: specificFlight.price,
                                airline: specificFlight.airline,
                                airline_logo: specificFlight.airline_logo
                            }]
                        };
                    } catch (error) { return null; }
                });

                // 🚀 Wait for BOTH the Explore API and the Specific APIs to finish simultaneously!
                const [exploreResults, ...specificResults] = await Promise.all([explorePromise, ...specificPromises]);
                
                localCandidates.push(...exploreResults);
                localCandidates.push(...specificResults.filter(r => r !== null));
            }

            return localCandidates
        })

        // Resolve all branch expansions for this hop at once
        const allCandidatesNested = await Promise.all(hopPromises);
        let nextCandidates = allCandidatesNested.flat(); // Flatten the arrays into one big pool

        if (nextCandidates.length === 0) {
            // Two very different failures, told apart at last. The prefix is what
            // server.js matches on to choose the message and the HTTP status.
            if (upstreamFailed) {
                throw new Error("UPSTREAM_UNAVAILABLE: the flight data provider did not answer, so no routes could be checked.");
            }
            throw new Error("No valid routes found to continue the itinerary. Constraints may be too strict.");
        }

        // --- ONE CANDIDATE PER PATH ---
        //
        // Two branches can build the same route on the same day: the explore call
        // and the mandatory-destination call fire simultaneously and do not know
        // about each other. Identical candidates used to take a beam slot EACH,
        // which cost the search a real expansion call at every later hop and halved
        // the number of genuine alternatives it carried (Phase 0C session 4).
        //
        // Which copy survives is a decision, not a detail. google_flights is the
        // engine that actually sells the ticket; google_travel_explore's price is an
        // estimate from a different engine whose reliability is a known open
        // question. Preferring the cheaper copy would quietly favour that estimate
        // and show a price the booking engine does not offer, so the authoritative
        // one wins first and cost only breaks a tie between equals.
        const bestByPath = new Map()
        for (const candidate of nextCandidates) {
            const key = candidate.path.join(',')
            const incumbent = bestByPath.get(key)
            if (!incumbent) {
                bestByPath.set(key, candidate)
                continue
            }
            const better = candidate.source !== incumbent.source
                ? candidate.source === 'flights'
                : candidate.totalCost < incumbent.totalCost
            if (better) bestByPath.set(key, candidate)
        }
        nextCandidates = [...bestByPath.values()]

        // --- 🌟 STRATIFIED BEAM PRUNING 🌟 ---
        
        // Step 1: Calculate constraint progress for every candidate
        nextCandidates.forEach(candidate => {
            candidate.fulfilledCount = includeDestinations.filter(dest => candidate.path.includes(dest)).length;
        });

        // Step 2: Sort purely by cost first
        nextCandidates.sort((a, b) => a.totalCost - b.totalCost);

        let newBeam = [];
        // To ensure we don't accidentally add the exact same route twice. It only
        // does that if every loop below READS it -- the cheapest-slots loop used to
        // write it and never check it, which is how identical candidates took two
        // consecutive slots. Redundant now that candidates are unique by path, and
        // kept deliberately: it is the guard that survives a future change upstream.
        let addedPaths = new Set();
        
        //expand beam on the final hop so we have backup candidates for the return flight
        const targetBeamSize = (hop === numDestinations - 1) ? beamWidth + 3 : beamWidth

        // Slot 1 & 2: Take the absolute cheapest routes available
        const numCheapestSlots = Math.max(1, targetBeamSize - 1); 
        for (let i = 0; i < nextCandidates.length && newBeam.length < numCheapestSlots; i++) {
            const key = nextCandidates[i].path.join(',');
            if (addedPaths.has(key)) continue;
            newBeam.push(nextCandidates[i]);
            addedPaths.add(key);
        }

        // Slot 3 (The Constraint Survivor): Find the cheapest remaining route with the HIGHEST fulfilled constraints
        if (newBeam.length < targetBeamSize && includeDestinations.length > 0) {
            let remaining = nextCandidates.filter(c => !addedPaths.has(c.path.join(',')));
            
            if (remaining.length > 0) {
                // Sort remaining primarily by fulfilled constraints (descending), then by cost (ascending)
                remaining.sort((a, b) => {
                    if (b.fulfilledCount !== a.fulfilledCount) {
                        return b.fulfilledCount - a.fulfilledCount;
                    }
                    return a.totalCost - b.totalCost;
                });
                
                newBeam.push(remaining[0]);
                addedPaths.add(remaining[0].path.join(','));
            }
        }

        // If the beam still isn't full (e.g., no includes needed), fill it with whatever cheapest routes are left
        let remaining = nextCandidates.filter(c => !addedPaths.has(c.path.join(',')));
        while (newBeam.length < targetBeamSize && remaining.length > 0) {
            const next = remaining.shift();
            const key = next.path.join(',');
            if (addedPaths.has(key)) continue;
            newBeam.push(next);
            addedPaths.add(key);
        }

        beam = newBeam;
    }

    // Final Step: Calculate the return leg back to the origin
    // 🚀 BATCH OPTIMIZATION: 1 API Call for ALL return legs!

    const finalDate = addDaysToDate(startDate, numDestinations * daysPerLeg)
    let completedItineraries = []

    // Gather all unique last airports from current beam (Max 7)
    const lastAirports = beam.map(itin => itin.path[itin.path.length - 1])
    const uniqueLastAirports = [...new Set(lastAirports)].slice(0, 7)

    if (uniqueLastAirports.length > 0) {
        const originsStr = uniqueLastAirports.join(",")
        console.log(`[FINAL RETURN] Batch fetching returns from [${originsStr}] to ${origin}`)

        try {
            const returnFlights = await fetchBatchFlights(originsStr, origin, finalDate, region, currency, adults, children);
            
            // Map the absolute best flight per origin airport
            const bestReturnPerOrigin = {}
            returnFlights.forEach(flight => {
                if (!bestReturnPerOrigin[flight.from] || flight.price < bestReturnPerOrigin[flight.from].price) {
                    bestReturnPerOrigin[flight.from] = flight
                }
            })

            // Compromise: BEAM repair logic
            const foundReturns = Object.keys(bestReturnPerOrigin)
            if (foundReturns.length < beamWidth) {
                const missingReturns = uniqueLastAirports.filter(apt => !foundReturns.includes(apt))
                const needed = Math.max(0, beamWidth - foundReturns.length)
                const returnsToFetch = missingReturns.slice(0, needed)

                if (returnsToFetch.length > 0) {
                    console.log(`[FINAL RETURN REPAIR] Batch starved. Fetching ${returnsToFetch.length} missing returns individually...`)

                    const repairPromises = returnsToFetch.map(async (apt) => {
                        try {
                            const flight = await fetchReturnFlight(apt, origin, finalDate, region, currency, adults, children)
                            bestReturnPerOrigin[apt] = {
                                from: apt,
                                to: origin,
                                price: flight.price,
                                airline: flight.airline,
                                airline_logo: flight.airline_logo
                            }
                        } catch(e) {
                            // Ignore
                        }
                    })
                    await Promise.all(repairPromises)
                }
            }

            // Re-attach successful return flights to their parent itineraries in the beam
            beam.forEach(itinerary => {
                const lastAirport = itinerary.path[itinerary.path.length - 1]
                const returnFlight = bestReturnPerOrigin[lastAirport]
                if (returnFlight) {
                    completedItineraries.push({
                        ...itinerary,
                        path: [...itinerary.path, origin],
                        dates: [...itinerary.dates, finalDate],
                        totalCost: itinerary.totalCost + returnFlight.price,
                        flights: [...itinerary.flights, {
                            from: lastAirport,
                            to: origin,
                            price: returnFlight.price,
                            airline: returnFlight.airline,
                            airline_logo: returnFlight.airline_logo
                        }],
                        // Both are internal bookkeeping: the constraint counter used by
                        // the stratified pruning, and the engine tag used to decide which
                        // copy of a duplicated path survives. JSON.stringify drops
                        // undefined, so neither reaches the browser.
                        fulfilledCount: undefined,
                        source: undefined
                    })
                }
            })
        } catch (e) {
            console.error(`[FINAL RETURN ERROR] ${e.message}`)
        }
        // Final sort to guarantee the absolute cheapest completed itinerary is at the top
        completedItineraries.sort((a,b) => a.totalCost - b.totalCost)

        // A detector, not a filter. Candidates are unique by path and the beam guard
        // now reads itself, so this cannot fire -- but duplicates reached real users
        // once, and a silent filter here would have hidden the cause instead of
        // showing it. If it ever fires, the log says so and the list is still served.
        const seenPaths = new Set()
        const repeated = completedItineraries.filter(itin => {
            const key = itin.path.join(',')
            if (seenPaths.has(key)) return true
            seenPaths.add(key)
            return false
        })
        if (repeated.length > 0) {
            console.warn(`[DUPLICATE ROUTES] ${repeated.length} itinerary/ies repeat a path: ${[...new Set(repeated.map(i => i.path.join('>')))].join(' | ')}`)
        }

        return completedItineraries

    }
}

module.exports = {
    generateMultiCityItineraries
}