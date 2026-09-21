import { escapeHtml, safeUrl } from "./escape.js?v=20260921"

//helper function to read cookies
function getCookie(name) {
    const cookies = document.cookie.split('; ')
    for (const cookie of cookies) {
        const [key, value] = cookie.split('=')
        if (key === name) return decodeURIComponent(value)
    }
    return null
}

// Airport dictionary for IATA tooltips 
let airportDict = {}

async function loadAirportDict() {
    try {
        const res = await fetch("/api/airports/all")
        const data = await res.json()
        if (data.success) {
            data.data.forEach(item => {
                airportDict[item.value] = item.label.split(" (")[0]
            })
        }
    } catch (e) {
        console.warn("Could not load airport dictionary for tooltips.", e)
    }
}

// Wraps an IATA code in a tooltip span 
function airportSpan(iata) {
    const city = airportDict[iata] || iata
    // Both halves are escaped: the code comes from a saved row and the city name
    // from /api/airports/all. Neither is ours to trust once it is HTML.
    return `<span title="${escapeHtml(city)}" style="cursor:help; text-decoration: underline dotted #CAC4D0; margin: 0 2px;">${escapeHtml(iata)}</span>`
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadAirportDict() // populate dict before rendering any cards

    const container = document.getElementById('saved-itineraries-container');

    try {
        //Check if user is logged in
        const authRes = await fetch('auth_status.php')
        const auth = await authRes.json()

        let savedTrips = []

        if (auth.logged_in) {
            //If user just logged in, check if they have guest trips hiding in localStorgae
            let guestTrips = JSON.parse(localStorage.getItem("pista_guest_trips")) ||[]
            if (guestTrips.length > 0) {
                console.log("Syncing guest trips to database...")
                for (let trip of guestTrips) {
                    await fetch("add_itinerary.php", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(trip)
                    })
                }
                // wipe local storage noow that they're safely in the database
                localStorage.removeItem("pista_guest_trips")
            }
            
            //Fetch the data from the PHP backend
            const response = await fetch('retrieve_itineraries.php');
            savedTrips = await response.json();
            
        } else {
            //GUEST UI ADJUSTMENTS

            //Prompt encouraging them to sign up
            const banner = document.createElement("div")
            banner.innerHTML = `
                <div style="background: var(--md-sys-color-primary-container); padding: 16px; border-radius: 12px; margin-bottom: 24px; color: var(--md-sys-color-on-primary-container); display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap;">
                    <div style="flex: 1 1 min-content;">
                        <strong>Guest Mode:</strong> Your trips are saved temporarily on this device.<br>
                        <span style="font-size: 14px; opacity: 0.8;">If you clear your browser data, these will be lost.</span>
                    </div>
                    <md-filled-button onclick="window.location.href='signup.html'">Sign Up to Save</md-filled-button>
                </div>
            `;
            container.parentNode.insertBefore(banner, container)

            // Fetch unofficial trips from LocalStorage
            savedTrips = JSON.parse(localStorage.getItem("pista_guest_trips")) || []
        }

        container.innerHTML = ''; // Clear the "Loading..." text

        if (!savedTrips || savedTrips.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 48px 24px; background: white; border-radius: 16px; border: 2px dashed #CAC4D0; width: 100%; box-sizing: border-box;">
                    <span class="material-symbols-outlined" style="font-size: 48px; color: #9e9e9e; margin-bottom: 16px;">flight_takeoff</span>
                    <h3 style="margin: 0 0 8px 0; color: #1D1B20; font-size: 20px;">${window.translations[window.currentLang]["no-trips-title"]}</h3>
                    <p style="color: #49454F; margin: 0;">${window.translations[window.currentLang]["no-trips-desc"]}</p>
                </div>
            `
            return;
        }

        const userRegion = getCookie('region') || 'uk'
        const localeMap = { 'uk': 'en-GB', 'us': 'en-US', 'es': 'es-ES'}
        const locale = localeMap[userRegion] || 'en-GB'

        // Loop through the database results and build the UI cards
        savedTrips.forEach((trip, index) => {
            
            // Reconstruct the route path (e.g., LHR -> ATH -> FCO -> LHR)
            const path = [];
            trip.flights.forEach(f => path.push(f.from));
            path.push(trip.flights[trip.flights.length - 1].to); // Add the final destination
            
            const routeString = path.map(airportSpan).join(' ➔ ');
            const startDate = trip.flights[0].date || (trip.dates ? trip.dates[0] : "Unknown Date");
            const endDate = trip.flights[trip.flights.length - 1].date || (trip.dates ? trip.dates[trip.dates.length - 1] : "Unknown Date");

            const tripCurrency = trip.currency || 'GBP'

            const priceFormatter = new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: tripCurrency.toUpperCase(),
                minimumFractionDigits: 0, //avoid decimals - keep ui clean
                maximumFractionDigits: 0
            })

            // Calculate Total Price Changes for the Itinerary Header
            let tripPriceChangeHtml = ""
            let tripPriceChangeTooltip = ""
            const currentTotal = trip.totalCost || trip.total_cost
            const previousTotal = trip.previousCost || trip.previous_cost

            if (previousTotal !== null && previousTotal !== undefined) {
                if (currentTotal == -1) {
                    tripPriceChangeHtml = `<span style="color: #BA1A1A; font-size: 12px; margin-left: 8px;">(Unavailable)</span>`
                } else if (currentTotal < previousTotal) {
                    tripPriceChangeHtml = `<span style="color: #198754; font-size: 14px; margin-left: 6px;" title="Price decreased: ${priceFormatter.format(previousTotal)} ➔ ${priceFormatter.format(currentTotal)}">▼</span>`
                } else if (currentTotal > previousTotal) {
                    tripPriceChangeHtml = `<span style="color: #DC3545; font-size: 14px; margin-left: 6px;" title="Price increased: ${priceFormatter.format(previousTotal)} ➔ ${priceFormatter.format(currentTotal)}">▲</span>`
                } else {
                    tripPriceChangeHtml = `<span style="color: #6C757D; font-size: 14px; margin-left: 6px;" title="Price unchanged: ${priceFormatter.format(currentTotal)}">■</span>`
                }
            }

            let displayTotal = currentTotal == -1 ? '<span style="text-decoration: line-through; opacity: 0.6;">Unavailable</span>' : priceFormatter.format(currentTotal)

            // Generate HTML for each individual flight leg
            const flightDetailsHTML = trip.flights.map((flight, flightIndex) => {
                //Grab the date from the flight object (DB) or the parallel array (LocalStorage)
                const legDate = flight.date || (trip.dates ? trip.dates[flightIndex] : "Unknown Date");
                const legLogo = safeUrl(flight.airline_logo)
                const logoHtml = legLogo ? `<img src="${legLogo}" style="width:16px; height:16px; vertical-align:middle; border-radius:2px; margin-right:4px; background: white;">` : ""

                // Handle Price History and unavailable flags for each leg
                let legPriceHtml = ""
                let legPriceChangeHtml = ""

                if (flight.price == -1 || flight.cost == -1) {
                    legPriceHtml = `<span style="text-decoration: line-through; opacity: 0.6;">Unavailable</span>`
                } else {
                    const legPrice = flight.price !== undefined ? flight.price : flight.cost
                    const prevLegPrice = flight.previous_cost !== undefined ? flight.previous_cost : null
                    legPriceHtml = priceFormatter.format(legPrice)

                    if (prevLegPrice !== null) {
                        if (legPrice < prevLegPrice) {
                            legPriceChangeHtml = `<span style="color: #198754; margin-left: 4px; cursor: help;" title="Price decreased: ${priceFormatter.format(prevLegPrice)} ➔ ${priceFormatter.format(legPrice)}">▼</span>`
                        } else if (legPrice > prevLegPrice) {
                            legPriceChangeHtml = `<span style="color: #DC3545; margin-left: 4px; cursor: help;" title="Price increased: ${priceFormatter.format(prevLegPrice)} ➔ ${priceFormatter.format(legPrice)}">▲</span>`
                        } else {
                            legPriceChangeHtml = `<span style="color: #6C757D; margin-left: 4px; cursor: help;" title="Price unchanged">■</span>`
                        }
                    }
                }

                return `<div style="display:flex; justify-content:space-between; font-size: 12px; margin-top: 4px; color: var(--md-sys-color-on-surface-variant);">
                            <span style="display:flex; align-items:center;">${logoHtml} ${escapeHtml(legDate)} • ${airportSpan(flight.from)} ➔ ${airportSpan(flight.to)} (${escapeHtml(flight.airline)})</span>
                            <span style="font-weight: bold;">${legPriceHtml}${legPriceChangeHtml}</span>
                        </div>`;
            }).join('');

            // Create the Material UI Card
            const flightBlock = document.createElement('div');
            flightBlock.className = 'flight-card';
            // Remove pointer cursor since they aren't selectable here
            flightBlock.style.cursor = 'default'; 

            // Add Warning banner if itinerary contains unavailable flights
            const warningBannerHtml = currentTotal == -1 ?
                `<div style="width: 100%; background-color: #FFDAD6; color: #BA1A1A; padding: 4px 12px; font-size: 12px; border-radius: 6px; margin-bottom: 8px; font-weight: bold;">
                    ⚠️ Warning: Some flights are no longer available.
                </div>` : ""

            //Use the logo of first flight for the main circular badge
            const firstLogo = safeUrl(trip.flights[0].airline_logo)
            const mainBadgeHtml = firstLogo ? `<img src="${firstLogo}" class="airline-logo" style="object-fit: contain; background: white;" alt="logo">` : `<div class="airline-logo">#${index + 1}</div>`

            // Added Price Verify button next to the delete button (hidden for Guests)
            const verifyBtnHtml = auth.logged_in ?
                `<md-filled-tonal-button class="verify-btn" style="--md-filled-tonal-button-container-height: 32px; font-size: 12px;">
                    Verify Price
                </md-filled-tonal-button>` : ""

            // Book Now button (always visible, works for guests too)
            const bookBtnHtml = `<md-filled-button class="book-now-btn" style="--md-filled-button-container-height: 32px; font-size: 12px;">
                <md-icon slot="icon" style="font-size: 16px;">flight_takeoff</md-icon>
                Book Now
                </md-filled-button>`


            flightBlock.innerHTML = `
                ${mainBadgeHtml}
                <div class="flight-info" style="width: 100%;">
                    ${warningBannerHtml}
                    <div class="route">${routeString}</div>
                    <div class="details" style="flex-direction: column; width: 100%;">
                        <div style="display:flex; justify-content:space-between; align-items: center; margin-bottom: 6px;">
                            <span class="date">${escapeHtml(startDate)} to ${escapeHtml(endDate)}</span>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span class="price">Total: ${displayTotal}${tripPriceChangeHtml}</span>

                                <md-filled-tonal-button class="view-map-btn" style="--md-filled-tonal-button-container-height: 32px; font-size: 12px;">
                                    <md-icon slot="icon" style="font-size: 16px;">map</md-icon> Map
                                </md-filled-tonal-button>

                                ${verifyBtnHtml}
                                ${bookBtnHtml}
                                
                                <md-icon-button class="delete-btn" style="color: #BA1A1A;">
                                    <md-icon>delete</md-icon>
                                </md-icon-button>
                                
                            </div>
                        </div>
                        <div style="border-top: 1px solid var(--md-sys-color-surface-variant); padding-top: 6px; width: 100%;">
                            ${flightDetailsHTML}
                        </div>
                    </div>
                </div>`

            if (auth.logged_in) {
                const verifyBtn = flightBlock.querySelector(".verify-btn")
                verifyBtn.addEventListener("click", async () => {
                    verifyBtn.innerHTML = "Verifying..."
                    verifyBtn.disabled = true

                    // Clean the payload to send to PHP
                    const payload = {
                        itinerary_id: trip.itinerary_id,
                        region: userRegion,
                        currency: tripCurrency,
                        flights: trip.flights.map(f => ({
                            flight_id: f.flight_id,
                            from: f.from,
                            to: f.to,
                            date: f.date || (trip.dates ? trip.dates[trip.flights.indexOf(f)] : null)
                        }))
                    }

                    try {
                        const res = await fetch("verify_itinerary.php", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload)
                        })
                        const data = await res.json()

                        if (data.success) {
                            // Reload page to fetch the fresh DB data with triangles and history!
                            window.location.reload()
                        } else {
                            alert("Verification Failed: " + data.error)
                            verifyBtn.innerHTML = "Verify Price"
                            verifyBtn.disabled = false
                        }
                    } catch (err) {
                        alert("Network error occured.")
                        verifyBtn.innerHTML = "Verify Price"
                        verifyBtn.disabled = false
                    }
                })
            }

            // Book Now button - sets sessionStorage flags and redirects to index.html booking flow
            const bookNowBtn = flightBlock.querySelector(".book-now-btn")
            bookNowBtn.addEventListener("click", () => {
                // don't allow booking a trip with unavailable flights
                if (currentTotal === -1) {
                    alert("This itinerary contains unavailabe flights. Please verify prices or delete this trip.")
                    return
                }
                const mapPayload = {
                    path: path,
                    flights: trip.flights,
                    dates: trip.dates || trip.flights.map(f => f.date),
                    totalCost: currentTotal,
                    itinerary_id: trip.itinerary_id,
                    adults: trip.adults || 1,
                    children: trip.children || 0
                }

                // tell index.js to render the booking view AND that back-arrow should return here
                sessionStorage.setItem("view_map_itinerary", JSON.stringify(mapPayload))
                sessionStorage.setItem("return_to", "itineraries")
                sessionStorage.setItem("auto_book", "true") // signals index.js to skip to Step 3
                window.location.href = "index.html"
            })

            const viewMapBtn = flightBlock.querySelector(".view-map-btn")
            viewMapBtn.addEventListener("click", () => {
                // construct payload exactly how animateItinerariesOnMap() in index.js expects it
                const mapPayload = {
                    path: path,
                    flights: trip.flights,
                    dates: trip.dates || trip.flights.map(f => f.date),
                    totalCost: currentTotal,
                    itinerary_id: trip.itinerary_id,
                    adults: trip.adults || 1,
                    children: trip.children || 0
                }
                sessionStorage.setItem("view_map_itinerary", JSON.stringify(mapPayload))
                window.location.href = "index.html"
            })

            const deleteBtn = flightBlock.querySelector('.delete-btn')
            deleteBtn.addEventListener('click', async () => {
                if (confirm(window.translations[window.currentLang]["js-delete-confirm"])) {
                    if (auth.logged_in) {
                        //Delete from DB
                        try {
                            const res = await fetch('delete_itinerary.php', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ itinerary_id: trip.itinerary_id})
                            })
                            const data = await res.json()
                            if (data.success) {
                                //Visually remove card from screen instantly
                                flightBlock.remove()
                            } else {
                                alert("Failed to delete: " + data.error)
                            }
                        } catch (err) {
                            console.error("Delete error:", err)
                        }
                    } else {
                        //Delete from LocalStorage
                        let currentGuestTrips = JSON.parse(localStorage.getItem("pista_guest_trips")) || []
                        currentGuestTrips = currentGuestTrips.filter(t => t.itinerary_id !== trip.itinerary_id)
                        localStorage.setItem("pista_guest_trips", JSON.stringify(currentGuestTrips))
                        flightBlock.remove()
                    }

                    //Handle empty state
                    if (container.children.length === 0) {
                        container.innerHTML = `<div style="text-align: center; padding: 48px 24px; background: white; border-radius: 16px; border: 2px dashed #CAC4D0; width: 100%; box-sizing: border-box;">
                                <span class="material-symbols-outlined" style="font-size: 48px; color: #9e9e9e; margin-bottom: 16px;">flight_takeoff</span>
                                <h3 style="margin: 0 0 8px 0; color: #1D1B20; font-size: 20px;">${window.translations[window.currentLang]["no-trips-title"]}</h3>
                                <p style="color: #49454F; margin: 0;">${window.translations[window.currentLang]["no-trips-desc"]}</p>
                            </div>`
                    }
                }
            })

            container.appendChild(flightBlock);
        });

    } catch (error) {
        console.error("Error loading itineraries:", error);
        container.innerHTML = '<p style="color:red;">Failed to load saved itineraries.</p>';
    }
});
