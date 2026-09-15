const API_KEY = process.env.SERPAPI_KEY

const { getJson } = require("serpapi")

function cleanParams(obj) {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined)
    )
}

function fetchExploreDestinations(originAirportCode, outboundDate, region, currency, adults = 1, children = 0) {

    console.log(`[API 1 CALL] Exploring flights from ${originAirportCode} to Anywhere on ${outboundDate}, region ${region}, currency ${currency} [A:${adults} C:${children}]`);

    return new Promise((resolve, reject) => {
        const params = cleanParams({
            api_key: API_KEY,
            engine: 'google_travel_explore',
            departure_id: originAirportCode,
            outbound_date: outboundDate,
            type: 2,
            gl: region, //def. 'uk'
            hl: 'en',
            currency: currency, //def. 'GBP'
            adults: adults,
            children: children
        })

        getJson(params, (data) => {
            if (data.error) {
                return reject(new Error(`SerpAPI Error: ${data.error}`))
            }
            if (data.destinations && data.destinations.length > 0) {
                resolve(data.destinations)
            } else {
                resolve([])
            }
        })

    })
}

function fetchReturnFlight(originAirportCode, destinationAirportCode, outboundDate, region, currency, adults = 1, children = 0) {
    console.log(`[API 2 CALL] Finding return flight from ${originAirportCode} to ${destinationAirportCode} on ${outboundDate}, region ${region}, currency ${currency} [A:${adults} C:${children}]`);

    return new Promise((resolve, reject) => {
        const params = cleanParams({
            api_key: API_KEY,
            engine: 'google_flights',
            departure_id: originAirportCode,
            arrival_id: destinationAirportCode,
            outbound_date: outboundDate,
            type: 2,
            gl: region, //def. 'uk'
            hl: 'en',
            currency: currency, //def.'GBP'
            adults: adults,
            children: children
        })
        getJson(params, (data) => {
            if (data.error) {
                return reject(new Error(`SerpAPI Error: ${data.error}`))
            }
            if (data.best_flights && data.best_flights.length > 0) {
                // Extracting the best price and airline from the nested payload
                const bestOption = data.best_flights[0]
                resolve({
                    price: bestOption.price,
                    airline: bestOption.flights[0].airline,
                    airline_logo: bestOption.flights[0].airline_logo
                })
            } else {
                reject(new Error(`No return flight found from ${originAirportCode} to ${destinationAirportCode}`))
            }
        })
    })


}

function fetchBatchFlights(originsStr, destinationsStr, outboundDate, region, currency, adults = 1, children = 0) {
    console.log(`[API 2 BATCH CALL] Finding flights from [${originsStr}] to [${destinationsStr}] on ${outboundDate}`)

    return new Promise((resolve, reject) => {
        const params = cleanParams({
            api_key: API_KEY,
            engine: "google_flights",
            departure_id: originsStr,
            arrival_id: destinationsStr,
            outbound_date: outboundDate,
            type: 2,
            gl: region,
            hl: "en",
            currency: currency,
            adults: adults,
            children: children
        })

        getJson(params, (data) => {
            if (data.error) {
                return reject(new Error(`SerpAPI Error: ${data.error}`))
            }
            if (data.best_flights && data.best_flights.length > 0) {
                // Map all top flights and extract their specific origin and destination
                const flights = data.best_flights.map(option => {
                    const firstLeg = option.flights[0]
                    const lastLeg = option.flights[option.flights.length - 1]

                    return {
                        from: firstLeg.departure_airport.id,
                        to: lastLeg.arrival_airport.id,
                        price: option.price,
                        airline: firstLeg.airline,
                        airline_logo: firstLeg.airline_logo
                    }
                })
                resolve(flights)
            } else {
                resolve([]) // resolve empty if no flights found
            }
        })
    })
}

module.exports = {
    fetchExploreDestinations,
    fetchReturnFlight,
    fetchBatchFlights
}