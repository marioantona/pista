// MUST be first -- api.js reads process.env at module load time
// so environment must be populated before any downstream require runs
require('dotenv').config({ quiet: true })

// Fail fast and loudly rather than at the first API call
// PISTA_API_SECRET verifies X-PISTA-Token and must match /var/www/pista.env.
// PISTA_API_SECRET_PREVIOUS and TOKEN_ENFORCE are optional, so not listed.
const REQUIRED_ENV = ['SERPAPI_KEY', 'PISTA_API_SECRET']
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key])
if (missingEnv.length > 0) {
    console.error(`[FATAL] Missing environment variables: ${missingEnv.join(', ')}`)
    console.error(`[FATAL] Expected in ~/pista-api/.env`)
    process.exit(1)
} 

const express = require('express');
const cors = require('cors');

// Import your brilliant routing engine!
const { generateMultiCityItineraries } = require('./main'); 
const { fetchReturnFlight } = require('./api');
const { requireToken } = require('./apiToken');
const { validateVerifyBody, validateSearchBody } = require('./requestLimits');

const app = express();
const PORT = 3000;

// 🔴 PM2 MUST RUN THIS IN FORK MODE -- a correctness requirement, not a preference.
// apiToken.js keeps its single-use replay cache in this process's memory. Under
// cluster mode each worker would see only part of the traffic, so a replayed
// X-PISTA-Token would be accepted whenever it reached a different worker --
// roughly half the time -- and the single-use guarantee would be gone.
// Check with: pm2 jlist  ->  "exec_mode": "fork_mode"

// --- Middleware ---
// CORS allows your web frontend (e.g., localhost:5173 or a live website) to make requests to this API
app.use(cors()); 
// This tells Express to automatically parse incoming JSON data from the frontend
app.use(express.json()); 

// BEAM SEARCH API Endpoint 
// We use a POST request because the frontend is sending us a "payload" of complex search parameters
// requireToken runs before any validation: no valid token, no work (RUNBOOK §17).
app.post('/api/search-flights', requireToken('search'), async (req, res) => {
    try {
        // Unpack the user's "order" from the incoming request body
        const {
            origin,
            startDate,
            numDestinations,
            daysPerLeg,
            avoidCountries = [],
            includeDestinations = [],
            avoidOriginCountry = false,
            region,
            currency,
            adults = 1,
            children = 0,
            travelRegion
        } = req.body;

        // Bound the search before any work. The token proves a credit was paid, not
        // how big the search is -- without these, numDestinations: 500 would run (item 7).
        const checked = validateSearchBody(req.body);
        if (!checked.ok) {
            return res.status(400).json({ success: false, error: checked.error });
        }
        // Deduplicated: each mandatory destination is priced separately in main.js.
        const { includeDestinations: uniqueIncludes } = checked.value;

        console.log(`[SERVER] Received search request for ${origin} starting ${startDate} for ${adults} Adults, ${children} Children`);

        // 2. Hand the order to the Kitchen (Your Algorithm)
        const itineraries = await generateMultiCityItineraries(
            origin, 
            startDate, 
            numDestinations, 
            daysPerLeg, 
            avoidCountries, 
            uniqueIncludes, 
            avoidOriginCountry,
            region,
            currency.toUpperCase(),
            adults,
            children,
            travelRegion
        );

        // 3. Serve the completed itineraries back to the user's browser!
        res.json({
            success: true,
            results: itineraries
        });

    } catch (error) {
        // If the algorithm throws an error (e.g., constraints too strict), catch it gracefully
        console.error(`[SERVER ERROR]`, error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Verify Prices Endpoint
// Only verify_itinerary.php calls this, over localhost -- Apache also denies it publicly.
app.post("/api/verify-itinerary", requireToken('verify'), async (req, res) => {
    try {
        // One SerpAPI call per leg, so the leg count is capped before any work (item 7).
        const checked = validateVerifyBody(req.body)
        if (!checked.ok) {
            return res.status(400).json({ success: false, error: checked.error })
        }
        const { flights, region, currency, adults, children } = checked.value

        console.log(`[SERVER] Verifying itinerary with ${flights.length} legs...`)

        // Map over flights array and fire concurrent API calls for each leg
        const verificationPromises = flights.map(flight => {
            return fetchReturnFlight(
                flight.from,
                flight.to,
                flight.date,
                region,
                currency,
                adults,
                children
            )
            .then(updatedFlight => ({
                flight_id: flight.flight_id, // Keep track of the DB ID
                status: "available",
                price: updatedFlight.price,
                airline: updatedFlight.airline,
                airline_logo: updatedFlight.airline_logo
            }))
            .catch(error => ({
                flight_id: flight.flight_id,
                status: "unavailable",
                price: -1.00, // Explicitly set to -1 for DB/frontend
                error: error.message
            }))
        })

        // Wait for all the API calls to finish concurrently
        const verifiedLegs = await Promise.all(verificationPromises)

        res.json({
            success: true,
            results: verifiedLegs
        })
    } catch (error) {
        console.error(`[SERVER ERROR] Verify Itinerary:${error.message}`)
        res.status(500).json({ success: false, error: error.message })
    }
})

// API Endpoint to fetch a single airport's coordinates
const airportDatabase = require('./airports.json');
const countriesDatabase = require("./countries.json")

// Serve lightweight lists for frontend autocomplete
app.get("/api/airports/all", (req, res) => {
    // Maps the heavy JSON into a lightweight array to save bandwidth
    const list = Object.keys(airportDatabase).map(iata => ({
        value: iata,
        label: `${airportDatabase[iata].city || "Unknown City"} (${iata}) - ${airportDatabase[iata].name || ""}`
    }))
    res.json({ success: true, data: list })
})

app.get("/api/countries/all", (req, res) => {
    res.json({ success: true, data: countriesDatabase })
})

app.get('/api/airport/:code', (req, res) => {
    const code = req.params.code.toUpperCase()
    const airport = airportDatabase[code]
    if (airport) {
        res.json({ success: true, lat: airport.lat, lon: airport.lon, country: airport.country })
    } else {
        res.status(404).json({ success: false, error: 'Airport not found' })
    }
})

// Start the Server
// bind to loopback only. Apache reverse-proxies /api from vhost so Node never needs to be reachable from outside the machine
app.listen(PORT, "127.0.0.1", () => {
    console.log(`🚀 Flight Routing Engine is live and listening on http://127.0.0.1:${PORT}`);
});
