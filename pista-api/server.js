// MUST be first -- api.js reads process.env at module load time
// so environment must be populated before any downstream require runs
require('dotenv').config({ quiet: true })

// Fail fast and loudly rather than at the first API call
const REQUIRED_ENV = ['SERPAPI_KEY']
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

const app = express();
const PORT = 3000;

// --- Middleware ---
// CORS allows your web frontend (e.g., localhost:5173 or a live website) to make requests to this API
app.use(cors()); 
// This tells Express to automatically parse incoming JSON data from the frontend
app.use(express.json()); 

// BEAM SEARCH API Endpoint 
// We use a POST request because the frontend is sending us a "payload" of complex search parameters
app.post('/api/search-flights', async (req, res) => {
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

        // Basic validation: Make sure the frontend didn't forget the required fields
        if (!origin || !startDate || !numDestinations || !daysPerLeg) {
            return res.status(400).json({ error: "Missing required search parameters." });
        }

        console.log(`[SERVER] Received search request for ${origin} starting ${startDate} for ${adults} Adults, ${children} Children`);

        // 2. Hand the order to the Kitchen (Your Algorithm)
        const itineraries = await generateMultiCityItineraries(
            origin, 
            startDate, 
            numDestinations, 
            daysPerLeg, 
            avoidCountries, 
            includeDestinations, 
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
app.post("/api/verify-itinerary", async (req, res) => {
    try {
        const { flights, region, currency} = req.body

        if (!flights || !Array.isArray(flights) || flights.length === 0) {
            return res.status(400).json({ error: "Missing or invalid flight data." })
        }

        console.log(`[SERVER] Verifying itinerary with ${flights.length} legs...`)

        // Map over flights array and fire concurrent API calls for each leg
        const verificationPromises = flights.map(flight => {
            return fetchReturnFlight(
                flight.from,
                flight.to,
                flight.date,
                region || "uk",
                (currency || "GBP").toUpperCase()
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
