// Autocomplete dictionaries
let globalAirportDict = {}
let globalAirportList = []
let globalCountryList = []

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const [aptRes, cntRes] = await Promise.all([
            fetch("/api/airports/all"),
            fetch("/api/countries/all")
        ])
        const aptData = await aptRes.json()
        const cntData = await cntRes.json()

        if (aptData.success) {
            globalAirportList = aptData.data
            // Build dictionary for tooltips later
            aptData.data.forEach(item => {
                // Extracts just the city name for the tooltip
                globalAirportDict[item.value] = item.label.split(" (")[0]
            })
        }
        if (cntData.success) {
            globalCountryList = cntData.data.map(c => ({ value: c, label: c}))
        }

        // Attach logic (Input El, Wrapper El, Data, isMultiChoice)
        setupAutocomplete(document.getElementById("returnStartEndDestination"), document.getElementById("origin-autocomplete"), globalAirportList, false)
        setupAutocomplete(document.getElementById("returnDesiredDestinations"), document.getElementById("dest-autocomplete"), globalAirportList, true)
        setupAutocomplete(document.getElementById("returnAvoidCountries"), document.getElementById("avoid-autocomplete"), globalCountryList, true)

    } catch (e) {
        console.error("Failed to load autocomplete dictionaries", e)
    }
})

// Enter Key Submission Handler
// MD Web Components use Shadow DOM, breaking native form Enter submission
document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return
    
    const tag = e.target.tagName.toLowerCase()
    if (tag !== "md-filled-text-field" && tag !== "md-outlined-text-field") return

    // Block Enter if an autocomplete dropdown is currently open
    const openDropdowns = document.querySelectorAll(".autocomplete-items.active")
    if (openDropdowns.length > 0) return

    // Determine context: auth modal or search card
    const authModal = document.getElementById("auth-modal")
    const isModalOpen = authModal && authModal.style.display === "flex"

    if (isModalOpen) {
        // Find whichever form is currently visible inside the modal
        const activeForm = authModal.querySelector(".form[style*='flex']") || authModal.querySelector(".form.active")

        if (activeForm) {
            const submitBtn = activeForm.querySelector("md-filled-button[type='submit']")
            if (submitBtn && !submitBtn.disabled) submitBtn.click()
        }
        return
    }

    // Search card context - map the focused field to its action button
    const searchCardFields = [
        "returnStartEndDestination",
        "returnDesiredDestinations",
        "returnAvoidCountries",
        "returnNumberOfDestinations",
        "returnDaysPerDestination",
        "returnDate",
        "returnAdult",
        "returnChild"
    ]

    if (searchCardFields.includes(e.target.id)) {
        const searchBtn = document.getElementById("search-btn")
        if (searchBtn && !searchBtn.disabled) searchBtn.click()
    }
})

const LARGE_DOMESTIC_MARKETS = new Set([
    "United States", "Canada", "Russia", "China", "Brazil", "Australia", "India"
])


// IATA Autocomplete Scoring

const MAJOR_HUBS = new Set([
    // UK & Ireland
    "LHR", "LGW", "MAN", "STN", "LTN", "EDI", "GLA", "BHX", "BRS", "DUB",
    // Western Europe
    "CDG", "ORY", "AMS", "FRA", "MUC", "BRU", "ZRH", "GVA", "VIE", "LIS",
    "MAD", "BCN", "FCO", "MXP", "LIN", "NAP", "ATH", "HEL", "ARN", "CPH",
    "OSL", "KEF",
    // Eastern / Central Europe
    "WAW", "PRG", "BUD", "OTP", "SOF", "BEG", "ZAG", "KRK",
    // Turkey / Middle East / Africa
    "DXB", "AUH", "DOH", "IST", "JED", "RUH", "CAI", "CMN", "NBO", "JNB",
    "CPT", "ADD", "LOS", "ACC",
    // Asia-Pacific
    "SIN", "BKK", "KUL", "CGK", "HND", "NRT", "ICN", "PEK", "PVG", "HKG",
    "TPE", "DEL", "BOM", "SYD", "MEL", "AKL", "CAN", "SZX", "TFU",
    // Americas
    "JFK", "LAX", "ORD", "ATL", "MIA", "DFW", "SFO", "YYZ", "YVR", "MEX",
    "GRU", "BOG", "SCL", "EZE", "LIM", "PTY", "DEN", "MCO",
    // Central America & Caribbean
    "CUN", "SJO", "PUJ"
])

const SECONDARY_HUBS = new Set([
    // UK & Ireland (regional)
    "NCL", "LBA", "EMA", "LPL", "SOU", "ABZ", "INV", "BFS", "ORK", "SNN",
    // France (regional)
    "LYS", "NCE", "MRS", "TLS", "BOD", "NTE", "MPL", "SXB", "LIL", "BIQ",
    // Germany (regional)
    "HAM", "DUS", "STR", "NUE", "CGN", "HAJ", "BRE", "LEJ", "FKB", "BER",
    // Spain (regional)
    "PMI", "AGP", "ALC", "IBZ", "VLC", "BIO", "SVQ", "ACE", "TFS", "FUE",
    "GRX", "SDR", "SCQ", "VGO",
    // Italy (regional)
    "VCE", "BGY", "PSA", "CTA", "PMO", "BRI", "BLQ", "TRN", "VRN", "OLB",
    // Portugal (regional)
    "OPO", "FAO",
    // Netherlands / Belgium / Switzerland (regional)
    "EIN", "RTM", "CRL", "BSL",
    // Scandinavia (regional)
    "GOT", "BGO", "TRD", "SVG", "TOS", "MMX", "RIX", "TLL", "VNO",
    // Eastern Europe (secondary)
    "WRO", "GDN", "POZ", "CLJ", "TSR", "LWO", "KBP", "SKP", "TIA", "SZG",
    "LNZ", "GRZ", "KLU",
    // Balkan & Adriatic
    "DBV", "SPU", "ZAD", "PUY", "SKG", "HER", "CFU", "RHO", "KGS", "JTR",
    "CHQ", "OHD", "PDV",
    // Turkey (secondary)
    "SAW", "ADB", "AYT", "ESB", "BJV", "TZX", "GZT", "HTY",
    // Middle East (secondary)
    "AMM", "BEY", "TLV", "MCT", "BAH", "KWI", "MED", "DMM",
    // Africa (secondary)
    "TUN", "ALG", "RAK", "MRK", "HRG", "SSH", "LXR", "DAR", "MBA", "KGL",
    "ABV", "KAN", "DKR", "ABJ", "FNA", "ROB",
    // South & Southeast Asia (secondary)
    "CCU", "MAA", "HYD", "BLR", "COK", "CMB", "KTM", "DAC", "ISB", "KHI",
    "RGN", "PNH", "REP", "VTE", "MDL", "URT", "HKT", "CNX", "DMK", "CEB",
    "DVO", "MNL", "BTH", "SUB", "DPS", "JOG",
    // East Asia (secondary)
    "CTU", "XIY", "CKG", "WUH", "KMG", "CSX", "TAO", "DLC", "HRB", "TSN",
    "OKA", "FUK", "NGO", "ITM", "CTS", "PUS", "CJU", "MFM",
    // Central Asia
    "ALA", "TAS", "FRU", "GYD", "TBS", "EVN",
    // Americas (secondary)
    "CLT", "SEA", "BOS", "EWR", "IAD", "IAH", "PHX", "MSP", "DTW", "FLL",
    "LAS", "SAN", "TPA", "PDX", "SLC", "AUS", "MDW", "BNA", "RDU", "MCI",
    "YUL", "YYC", "YEG", "YHZ", "GDL", "MTY", "SJD", "GIG", "BSB", "FOR",
    "REC", "SSA", "POA", "MVD", "UIO", "MDE", "CTG", "CLO", "GYE", "CUZ",
    "VVI", "CCP", "PMC", "AEP", "LGA",
    // Caribbean & Central America (secondary)
    "HAV", "SDQ", "SJU", "MBJ", "NAS", "POS", "BGI", "ANU", "GCM",
    "SAL", "GUA", "MGA", "BZE", "LIR", "DAP",
    // Oceania (secondary)
    "BNE", "PER", "ADL", "CBR", "OOL", "CNS", "WLG", "CHC", "HBA",
    "NAN", "SUV", "PPT", "APW", "IPC",
    // Canada (secondary)
    "YWG", "YXE", "YOW"
])

// Scores a single airport item against the user's search string.
// Higher score = shown first. Returns -1 if no match (exclude).
function scoreAirport(item, searchStr) {
    const search = searchStr.toLowerCase()
    const code = item.value.toLowerCase()
    const label = item.label.toLowerCase()

    if (!code.includes(search) && !label.includes(search)) return -1

    let score = 0

    // Exact IATA prefix match is the strongest signal
    if (code.startsWith(search)) score += 40
    else if (code.includes(search)) score += 20

    // City/label math
    if (label.startsWith(search)) score += 15
    else if (label.includes(search)) score += 5

    // Tiered hub bonus - applied on top of any match
    if (MAJOR_HUBS.has(item.value)) score += 25
    else if (SECONDARY_HUBS.has(item.value)) score += 12

    return score
}

function setupAutocomplete(inputEl, wrapperEl, dataList, isMulti) {
    inputEl.addEventListener("input", (e) => {
        const val = inputEl.value
        wrapperEl.innerHTML = ""
        wrapperEl.classList.remove("active")

        if (!val) return

        let searchStr = val
        //If it's a multi-box (like Avoid Countries), we only search the word they are typing after the last comma
        if (isMulti) {
            const parts = val.split(",")
            searchStr = parts[parts.length - 1].trim()
        }

        if (searchStr.length < 2) return

        // Score every item, filter out non-matches, sort by score descending
        const matches = dataList
            .map(item => ({ item, score: scoreAirport(item, searchStr) }))
            .filter(({ score }) => score > -1)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(({ item }) => item)

        if (matches.length > 0) {
            wrapperEl.classList.add("active")
            matches.forEach(match => {
                const div = document.createElement("div")
                div.className = "autocomplete-item"
                div.textContent = match.label

                div.addEventListener("click", () => {
                    if (isMulti) {
                        const parts = inputEl.value.split(",")
                        parts.pop() // Remove the partial typing
                        parts.push((parts.length > 0 ? " " : "") + match.value)
                        inputEl.value = parts.join(", ") + ", " // Add comma for the next entry
                    } else {
                        inputEl.value = match.value
                    }
                    wrapperEl.innerHTML = ""
                    wrapperEl.classList.remove("active")

                    // Manually trigger the 'blur" event so existing Map-Fly logic fires
                    inputEl.dispatchEvent(new Event("blur"))
                })
                wrapperEl.appendChild(div)
            })
        }
    })

    // Close dropdowns if user clicks anywhere else on the screen
    document.addEventListener("click", (e) => {
        if (e.target !== inputEl && e.target !== wrapperEl) {
            wrapperEl.innerHTML = ""
            wrapperEl.classList.remove("active")
        }
    })
}

// helper for +/- Stepper Buttons
window.stepInput = function(id, delta) {
    const input = document.getElementById(id)
    let val = parseInt(input.value) || 0
    const min = parseInt(input.min) || 0
    const max = parseInt(input.max) || 99

    val += delta
    if (val >= min && val <= max) {
        input.value = val
    }
}

// Leaflet Map
let userInput = null;
const map = L.map('map', {
    zoomControl: false
}).setView([48.5, 14.0], 4);

const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

let originMarker = null

L.control.zoom({
    position: 'bottomright'
}).addTo(map);

const originInput = document.getElementById('returnStartEndDestination');

// 'blur' fires when the user clicks outside the text box after typing
originInput.addEventListener('blur', async () => {
    const code = originInput.value.trim().toUpperCase();
    if (code.length === 3) { // Only search if it looks like a real IATA code
        try {
            const response = await fetch(`/api/airport/${code}`);
            const data = await response.json();
            
            if (data.success) {
                // If a marker already exists, remove it
                if (originMarker) map.removeLayer(originMarker); // guard against null on first blur
                
                // Drop a new marker and fly the map to it!
                originMarker = L.marker([data.lat, data.lon]).addTo(map)
                    .bindPopup(`<b>${code}</b><br>${data.country}`).openPopup();
                
                map.flyTo([data.lat, data.lon], 4, { animate: true, duration: 1.5 });

                // auto-check avoidOriginCountry for non-large-domestic-market
                const avoidCheckbox = document.getElementById("returnAvoidOriginCountry")
                if (avoidCheckbox) {
                    avoidCheckbox.checked = !LARGE_DOMESTIC_MARKETS.has(data.country)
                }
            }
        } catch (error) {
            console.log("Failed to fetch airport coordinates.");
        }
    }
});

// Page Switch
const steps = [
    document.getElementById('step1'),
    document.getElementById('step2'),
    document.getElementById('step3'),
    document.getElementById('step4'),
    document.getElementById('step5')
];
let currentStep = 0;

// ==== Auth Modal Logic ====
const authModal = document.getElementById("auth-modal")
const guestBtn = document.getElementById("continue-guest-btn")

// Helper function to show Welcome Modal once
function checkFirstVisit() {
    if (!localStorage.getItem("pista_welcome_shown")) {
        document.getElementById("welcome-modal").style.display = "flex"
        localStorage.setItem("pista_welcome_shown", "true")
    }
}

async function checkAuthAndShowModal() {
    if (sessionStorage.getItem("guest_mode")) {
        // Show Sign In button for guests who dismissed the modal
        const signinBtn = document.getElementById("signin-nav-btn")
        if (signinBtn) signinBtn.style.display = "flex"

        checkFirstVisit() // check if they are a returning guest in this session
        return
    }
    try {
        const res = await fetch("auth_status.php")
        const data = await res.json();
        if (!data.logged_in) {
            authModal.style.display = "flex"

            // Reveal Sign In button for unauthenticated users
            const signinBtn = document.getElementById("signin-nav-btn")
            if (signinBtn) signinBtn.style.display = "flex"
        } else {
            checkFirstVisit()
        }
    } catch (e) {}
}

// Trigger on load
checkAuthAndShowModal()

guestBtn.addEventListener("click", () => {
    sessionStorage.setItem("guest_mode", "true")
    authModal.style.display = "none"
    checkFirstVisit()
})

window.switchModalTab = function(tab) {
    document.getElementById("modal-login-form").style.display = tab === "login" ? "flex" : "none"
    document.getElementById("modal-signup-form").style.display = tab === "signup" ? "flex" : "none"

    document.getElementById("modal-login-tab").style.setProperty("--md-filled-tonal-button-container-color", tab === "login" ? "#6750A4" : "rgba(255,255,255,0.1)")
    document.getElementById("modal-signup-tab").style.setProperty("--md-filled-tonal-button-container-color", tab === "signup" ? "#6750A4" : "rgba(255,255,255,0.1)")
}

async function handleAuthSubmit(e, url) {
    e.preventDefault()
    const form = e.target
    const errorEl = form.querySelector(".error-message")
    const submitBtn = form.querySelector("md-filled-button[type='submit']")

    submitBtn.disabled = true
    const formData = new FormData(form)

    try {
        const res = await fetch(url, { method: "POST", body: formData })
        const data = await res.json()

        if (data.success) {
            authModal.style.display = "none"

            // Clear guest_mode so checkAuthAndShowModal() re-evaluates auth on reload
            sessionStorage.removeItem("guest_mode")

            // AIM to fetch quotas/ data without reload
            window.location.reload()
        } else {
            errorEl.textContent = data.error
            errorEl.style.display = "block"
        }
    } catch (err) {
        errorEl.textContent = "Network error occured."
        errorEl.style.display = "block"
    } finally {
        submitBtn.disabled = false
    }
}

document.getElementById("modal-login-form").addEventListener("submit", (e) => handleAuthSubmit(e, "login.php"))
document.getElementById("modal-signup-form").addEventListener("submit", (e) => handleAuthSubmit(e, "signup.php"))

window.initiateOAuth = function(provider) {
    // Scaffold for upcoming OAuth endpoints
    window.location.href = `oauth_handler.php?provider=${provider}`
}

// ==== End of Auth Modal Logic ====

//read browser cookies
function getCookie(name) {
    const cookies = document.cookie.split('; ')
    for (const cookie of cookies) {
        const [key, value] = cookie.split('=')
        if (key === name) return decodeURIComponent(value)
    }
    return null
}

function showStep(index) {
    steps.forEach((step, i) => {
        if (step) {
            step.style.display = (i === index) ? 'flex' : 'none';
        }
    });
    currentStep = index;

    // hide the back arrow when on the first step
    document.querySelectorAll(".back-btn").forEach(btn => {
        btn.style.visibility = (index === 0) ? "hidden" : "visible"
    })
}

//IATA validation.
async function isValidAirportCode(iata) {
    if (!iata || iata.length !== 3) return false
    try {
        const response = await fetch(`/api/airport/${iata}`)
        const data = await response.json()
        return data.success
    } catch (error) {
        return false
    }
}


let selectedFlight = "";
let selectedItineraryData = null

// Search Button Logic
const searchBtn = document.getElementById('search-btn');
searchBtn.addEventListener('click', async () => {
    let mustfill1 = document.getElementById('returnStartEndDestination').value
    let mustfill2 = document.getElementById('returnDate').value
    let mustfill3 = document.getElementById('returnNumberOfDestinations').value
    let mustfill4 = document.getElementById('returnDaysPerDestination').value
    if (!mustfill1 || !mustfill2 || !mustfill3 || !mustfill4) {
        alert(window.translations[window.currentLang]["js-fill-fields"]);
        return
    }
    
    //validation (date check)
    const selectedDate = new Date(mustfill2)
    const today = new Date()
    today.setHours (0, 0, 0, 0) //resets todays time for midnight (for clean day comparison)

    if (selectedDate < today) {
        alert(window.translations[window.currentLang]["js-past-date"])
        return
    }

    const originCode = mustfill1.trim().toUpperCase()

    // Extract Avoid Countries (splits by comma and removes extra spaces)
    const avoidInput = document.getElementById('returnAvoidCountries').value
    const avoidArray = avoidInput ? avoidInput.split(',').map(c => c.trim()) : []

    //extract desired destinations
    const includeInput = document.getElementById('returnDesiredDestinations').value
    const includeArray = includeInput ? includeInput.split(',').map(c => c.trim().toUpperCase()) : []

    // Mirror of pista-api/requestLimits.js, checked BEFORE check_quota.php charges.
    // The form's min/max only limit the +/- buttons; typed values reach here as-is,
    // and a search Node refuses would otherwise still cost 2 credits (item 7f).
    const wholeIn = (raw, min, max) => /^\d+$/.test(String(raw).trim()) && +raw >= min && +raw <= max
    const tr = (key, fallback) => (window.translations[window.currentLang] || {})[key] || fallback
    const adultRaw = document.getElementById("returnAdult").value
    const childRaw = document.getElementById("returnChild").value
    if (!wholeIn(mustfill3, 1, 10)) {
        alert(tr("js-bad-destinations", "Destinations must be a whole number from 1 to 10."))
        return
    }
    if (!wholeIn(mustfill4, 1, 20)) {
        alert(tr("js-bad-days", "Days per leg must be a whole number from 1 to 20."))
        return
    }
    if (!wholeIn(adultRaw, 1, 9) || !wholeIn(childRaw === "" ? "0" : childRaw, 0, 8)
        || +adultRaw + +(childRaw || 0) > 9) {
        alert(tr("js-bad-passengers", "Passengers: 1–9 adults and 0–8 children, with no more than 9 in total."))
        return
    }
    // Repeats count once, as in Node, which also receives the deduplicated list.
    const uniqueIncludes = [...new Set(includeArray.filter(c => c !== ""))]
    if (uniqueIncludes.length > parseInt(mustfill3)) {
        alert(tr("js-too-many-includes", "You cannot have more desired destinations than destinations."))
        return
    }

    //let user know inputs are being validated
    searchBtn.innerText = window.translations[window.currentLang]["js-validating"]

    //Check origin iata is valid
    const isOriginValid = await isValidAirportCode(originCode)
    if (!isOriginValid) {
        alert(`'${originCode}' - ${window.translations[window.currentLang]["js-invalid-origin"]}`)
        searchBtn.innerText = window.translations[window.currentLang]["search-btn"]
        return
    }

    for (const dest of uniqueIncludes) {
        const isDestValid = await isValidAirportCode(dest)
        if (!isDestValid) {
            alert(`'${dest}' - ${window.translations[window.currentLang]["js-invalid-dest"]}`)
            searchBtn.innerText = window.translations[window.currentLang]["search-btn"]
            return
        }
    }

    //all validations passed

    searchBtn.innerText = window.translations[window.currentLang]["js-quota-verifying"]
    // Single-use proof that check_quota.php charged for this search. The Express
    // server refuses /api/search-flights without it (RUNBOOK §17). It expires in
    // 120 s, so it is fetched here, immediately before the search, never cached.
    let searchToken = null
    try {
        const quotaRes = await fetch("check_quota.php")
        const quotaData = await quotaRes.json()

        if (!quotaData.success) {
            alert("🛑 " + quotaData.error)
            searchBtn.innerText = window.translations[window.currentLang]["search-btn"]
            return
        }
        searchToken = quotaData.token
        console.log(`Quota Approved! Remaining searches: ${quotaData.remaining} (${quotaData.type} user)`)
    } catch (error) {
        console.error("Quota check failed", error)
        alert(window.translations[window.currentLang]["js-quota-error"])
        searchBtn.innerText = window.translations[window.currentLang]["search-btn"]
        return
    }

    searchBtn.innerText = window.translations[window.currentLang]["search-btn"]

    const avoidOrigin = document.getElementById('returnAvoidOriginCountry').checked
    const userRegion = getCookie('region') || 'uk'
    const userCurrency = getCookie('currency') || 'gbp'

    // capture passenger counts
    const adultCount = parseInt(document.getElementById("returnAdult").value) || 1
    const childCount = parseInt(document.getElementById("returnChild").value) || 0

    // extract region dropdown
    const travelRegion = document.getElementById("returnTravelRegion").value || "any"

    //constructing payload the express server expects
    const searchParams = {
        origin: originCode,
        startDate: mustfill2,
        numDestinations: parseInt(mustfill3),
        daysPerLeg: parseInt(mustfill4),
        avoidCountries: avoidArray,
        includeDestinations: uniqueIncludes,
        avoidOriginCountry: avoidOrigin,
        region: userRegion,
        currency: userCurrency,
        adults: adultCount,
        children: childCount,
        travelRegion: travelRegion
    }

    console.log("Sending to Backend: ", searchParams)
    showStep(1)

    const resultsContainer = document.getElementById('step2db')
    resultsContainer.innerHTML = `
        <div style="display:flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; gap: 16px;">
            <md-circular-progress indeterminate style="--md-circular-progress-size: 54px;"></md-circular-progress>
            <p style="color: var(--md-sys-color-on-surface-variant); font-family: Roboto; font-size: 16px; text-align: center;">${window.translations[window.currentLang]["js-searching"]}</p>
        </div>
    `; 
    try {
        //Fetch from Express server
        const response = await fetch('/api/search-flights', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-PISTA-Token': searchToken
            },
            body: JSON.stringify(searchParams)  
        })

        const data = await response.json()

        if (data.success) {
            console.log('API Data loaded:', data.results)
            renderFlightData(data.results, 'step2db')

            //triggers map animation
            animateItinerariesOnMap(data.results)
        } else {
            resultsContainer.innerHTML = `<p style="color:red;">Error: ${data.error}</p>`
        }
    } catch (error) {
        console.error('Fetch error:', error)
        resultsContainer.innerHTML = '<p>Failed to connect to the routing server. Make sure Express backend is running.</p>'
    }
});

const navFlights = document.getElementById('nav-flights');
const navItineraries = document.getElementById('nav-itineraries');
navItineraries.classList.add('inactive');
let savedStep = 0

document.getElementById('nav-itineraries').onclick = () => {
    if (currentStep !== 4) {
        savedStep = currentStep;
    }
    showStep(4);
    navFlights.classList.add('inactive');
    navItineraries.classList.remove('inactive');

    // Trigger the Mini-Dashboard to load
    loadMiniDashboard()    
}
document.getElementById('nav-flights').onclick = () => {
    if (currentStep == 4) {
        showStep(savedStep)
    }
    navFlights.classList.remove('inactive');
    navItineraries.classList.add('inactive');
}

// Wraps an IATA code in a <span> with a human-readable city name tooltip.
// Falls back to the raw code if the dict doesn't have an entry.
function airportSpan(iata) {
    const city = globalAirportDict[iata] || iata
    return `<span title="${city}" style="cursor:help; text-decoration: underline dotted var(--md-sys-color-surface-variant); margin: 0 2px;">${iata}</span>`
}

async function loadMiniDashboard() {
    const container = document.getElementById("step5db")
    container.innerHTML = "<div style='display: flex; justify-content: center; padding: 40px;'><md-circular-progress indeterminate></md-circular-progress></div>"

    try {
        const authRes = await fetch("auth_status.php")
        const auth = await authRes.json()
        let savedTrips = []

        if (auth.logged_in) {
            const res = await fetch("retrieve_itineraries.php")
            savedTrips = await res.json()
        } else {
            savedTrips = JSON.parse(localStorage.getItem("pista_guest_trips")) || []            
        }

        if (!savedTrips || savedTrips.length === 0) {
            container.innerHTML = `
            <div style="text-align: center; padding: 48px 24px; background: white; border-radius: 16px; border: 2px dashed #CAC4D0; margin-top: 16px;">
                <span class="material-symbols-outlined" style="font-size: 48px; color: #9e9e9e; margin-bottom: 16px;">flight_takeoff</span>
                <h3 style="margin: 0 0 8px 0; color: #1D1B20; font-size: 20px;">No saved trips yet</h3>
                <p style="color: #49454F; margin: 0;">Start searching to build your wishlist!</p>
            </div>
            `
            return
        }

        container.innerHTML = ""
        const displayTrips = savedTrips.slice(0, 3)
        const userRegion = getCookie("region") || "uk"
        const localeMap = { "uk": "en-GB", "us": "en-US", "es": "es-ES"}
        const locale = localeMap[userRegion] || "en-GB"

        displayTrips.forEach((trip, index) => {
            const path = []
            trip.flights.forEach(f => path.push(f.from))
            path.push(trip.flights[trip.flights.length - 1].to)
            const routeString = path.map(airportSpan).join(" ➔ ")
            const startDate = trip.flights[0].date || (trip.dates ? trip.dates[0] : "Unknown Date")

            const tripCurrency = trip.currency || "GBP"
            const priceFormatter = new Intl.NumberFormat(locale, { style: "currency", currency: trip.currency || 'GBP', maximumFractionDigits: 0})

            //Airline logo
            const firstLogo = trip.flights[0].airline_logo
            const mainBadgeHtml = firstLogo 
            ? `<img src="${firstLogo}" class="airline-logo" style="object-fit: contain; background: white;" alt="logo">`
            : `<div class="airline-logo" style="background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container);">#${index + 1}</div>`

            const card = document.createElement("div")
            card.className = "flight-card"
            card.style.cursor = "default"
            card.innerHTML = `
                ${mainBadgeHtml}
                <div class="flight-info" style="width: 100%;">
                    <div class="route">${routeString}</div>
                    <div class="details">
                        <span class="date">${startDate}</span>
                        <span class="price">${priceFormatter.format(trip.totalCost || trip.total_cost)}</span>
                    </div>
                </div>
                `
            container.appendChild(card)            
        })

        //Add View More button
        const viewMoreBtn = document.createElement("md-filled-tonal-button")
        viewMoreBtn.style.width = "100%"
        viewMoreBtn.style.marginTop = "16px"
        viewMoreBtn.textContent = savedTrips.length > 3 ? `View all ${savedTrips.length} saved trips` : "Manage Itineraries"
        viewMoreBtn.onclick = () => window.location.href = "itineraries.html"
        container.appendChild(viewMoreBtn)

    } catch (e) {
        container.innerHTML = "<p style='color:red;'>Failed to load itineraries.</p>"
    }
}

document.querySelectorAll('.next-btn').forEach(btn => {
    if (btn.id !== 'search-btn') {
        btn.addEventListener('click', () => {
            if (currentStep === 1) {
                if (!selectedFlight) {
                    alert(window.translations[window.currentLang]["js-select-flight"])
                    return;
                }

                // dynamic booking hub logic
                const step3Container = document.getElementById("step3db")
                step3Container.innerHTML = ""

                // AFFILIATE SETTINGS
                const markerId = "722485" // account marker id
                const lang = window.currentLang || 'en'
                const currency = getCookie("currency") || "gbp"

                // map local languages to Avivasales supported ones (fallback ca-> es)
                const affiliateLang = (lang === "ca") ? "es" : lang

                // build the header
                let hubHtml = `
                    <div style="padding: 16px; background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); border-radius: 16px; margin-bottom: 24px; text-align: center;">
                        <h3 style="margin: 0 0 8px 0; font-size: 18px;">Ready to Book?</h3>
                        <p style="margin: 0; font-size: 14px; opacity: 0.9;">To secure these prices, book each leg below. We recommend opening them in new tabs.</p>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px;">`

                // loop through every flight in the selected trip
                selectedItineraryData.flights.forEach((flight, index) => {
                    const legDate = flight.date || (selectedItineraryData.dates ? selectedItineraryData.dates[index] : "")
                    const origin = flight.from
                    const dest = flight.to

                    // format date to "DDMM" for Aviasales URL string
                    let formattedDate = ""
                    if (legDate) {
                        const parts = legDate.split("-")
                        if (parts.length === 3) {
                            formattedDate = `${parts[2]}${parts[1]}` // extracts DD and MM
                        } else {
                            const d = new Date(legDate)
                            formattedDate = String(d.getDate()).padStart(2, "0") + String(d.getMonth() + 1).padStart(2, "0")
                        }
                    }

                    // Grab passenger counts from the form so they carry over to the booking page
                    const adults = selectedItineraryData.adults ?? parseInt(document.getElementById("returnAdult").value) ?? 1
                    const children = selectedItineraryData.children ?? parseInt(document.getElementById("returnChild").value) ?? 0

                    //build dynamic deep link (native aviasales)
                    const passengerString = parseInt(children) > 0 ? `${adults}${children}` : `${adults}`
                    const deepLink = `https://www.aviasales.com/search/${origin}${formattedDate}${dest}${passengerString}?marker=${markerId}&currency=${currency.toLowerCase()}`

                    const logoHtml = flight.airline_logo
                        ? `<img src="${flight.airline_logo}" style="width:28px; height:28px; border-radius: 4px; background: white; object-fit: contain;">`
                        : `<md-icon style="font-size:28px; color: var(--md-sys-color-primary);">flight</md-icon>`

                    hubHtml += `
                        <div style="border: 1px solid var(--md-sys-color-surface-variant); border-radius: 12px; padding: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: white;">
                            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                                ${logoHtml}
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-weight: bold; font-size: 14px; color: var(--md-sys-color-on-surface);">${origin} ➔ ${dest}</span>
                                    <span style="font-size: 12px; color: var(--md-sys-color-on-surface-variant);">${legDate} • ${flight.airline}</span>
                                </div>
                            </div>
                            <md-filled-button onclick="window.open('${deepLink}', '_blank')" style="--md-filled-button-container-height: 36px; font-size: 13px;">
                                <md-icon slot="icon" style="font-size: 16px;">open_in_new</md-icon> Book
                            </md-filled-button>
                        </div>`
                })

                hubHtml += "</div>"
                step3Container.innerHTML = hubHtml

                // Hide the standard confirm button since they are clicking out to external sites now
                const step3ContainerDiv = document.getElementById("step3")
                const confirmBtn = step3ContainerDiv.querySelector(".next-btn")
                if (confirmBtn) confirmBtn.style.display = "none"
            }

            if (currentStep === 2) {          
                setTimeout(() => { window.location.href = "itineraries.html"; }, 3000)
            }

            if (currentStep < 3) { 
                showStep(currentStep + 1);
            }
        })
    }
});

let isViewingSavedTrip = false // flag to track if user came from saved itineraries

document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // If user came from itineraries page, send them back there
        if (isViewingSavedTrip) {
            window.location.href = "itineraries.html"
            return
        }

        if (currentStep > 0 && currentStep < 4) {
            showStep(currentStep - 1);
        } else if (currentStep === 4) {
            showStep(savedStep);
        }
    });
});

////==================START OF MAP LOGIC==================

let currentMapLayers = []; // Keeps track of lines/markers so we can clear them on new searches
let itineraryLayers = []

// helper: calculate geographical bearing between two points for the arrow rotation
function calculateBearing(lat1, lon1, lat2, lon2) {
    const toRad = Math.PI / 180
    const toDeg = 180 / Math.PI
    const dLon = (lon2 - lon1) * toRad
    const y = Math.sin(dLon) * Math.cos(lat2 * toRad)
    const x = Math.cos(lat1 * toRad) * Math.sin(lat2 * toRad) - Math.sin(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos(dLon)
    const bearing = Math.atan2(y, x) * toDeg
    return (bearing + 360) % 360
}

// 1. Math: Generates a curved array of coordinates between two airports
function generateBezierCurve(lat1, lon1, lat2, lon2, routeIndex = 0) {
    const points = [];
    const numPoints = 40; // Higher = smoother curve, but slower animation

    // Find the midpoint
    const midLat = (lat1 + lat2) / 2;
    const midLon = (lon1 + lon2) / 2;
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    // Control point determines the bend. We offset it perpendicularly.
    // Stagger the curves based on the itinerary index to prevent identical routes from overlapping
    const sign = routeIndex % 2 === 0 ? 1 : -1
    const magnitude = 0.2 + (Math.floor(routeIndex / 2) * 0.15)
    const curveFactor = sign * magnitude

    const ctrlLat = midLat - (dLon * curveFactor);
    const ctrlLon = midLon + (dLat * curveFactor);

    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const u = 1 - t;
        // Quadratic Bezier formula
        const lat = u*u*lat1 + 2*u*t*ctrlLat + t*t*lat2;
        const lon = u*u*lon1 + 2*u*t*ctrlLon + t*t*lon2;
        points.push([lat, lon]);
    }
    return points;
}

// 2. Helper: Fetch coordinates from your backend
async function getAirportCoords(iata) {
    try {
        const res = await fetch(`/api/airport/${iata}`);
        const data = await res.json();
        return data.success ? { lat: data.lat, lon: data.lon } : null;
    } catch (e) {
        return null;
    }
}

// 3. The Master Animation Function
async function animateItinerariesOnMap(itineraries) {
    // Clear old lines and markers
    currentMapLayers.forEach(layer => map.removeLayer(layer));
    currentMapLayers = [];
    itineraryLayers = []

    // Gather all unique airports from the results so we only fetch their coordinates once
    const uniqueCodes = new Set();
    itineraries.forEach(it => it.path.forEach(code => uniqueCodes.add(code)));

    const coordsMap = {};
    const routeBounds = L.latLngBounds()

    for (const code of uniqueCodes) {
        const data = await getAirportCoords(code);
        if (data) {
            coordsMap[code] = data
            routeBounds.extend([data.lat, data.lon])
        }
    }

    const startDrawing = () => {
        // Process and draw each itinerary
        itineraries.forEach((itinerary, index) => {
            const isCheapest = index === 0;

            itineraryLayers[index] = {lines: [], markers: []}
            
            // Styling: Cheapest is bold purple, others are translucent grey
            const color = isCheapest ? '#6750A4' : '#9e9e9e';
            const weight = isCheapest ? 4 : 2;
            const opacity = isCheapest ? 1 : 0.4;

            let fullPathCoords = [];

            // Generate the curved segments for the entire trip
            for (let i = 0; i < itinerary.path.length - 1; i++) {
                const startCode = itinerary.path[i];
                const endCode = itinerary.path[i+1];

                if (coordsMap[startCode] && coordsMap[endCode]) {
                    const start = coordsMap[startCode];
                    const end = coordsMap[endCode];
                    
                    // Drop a tiny dot for the layover airport
                    const dot = L.circleMarker([end.lat, end.lon], {
                        radius: 4, color: color, fillColor: '#fff', fillOpacity: 1, weight: 2
                    }).addTo(map);
                    currentMapLayers.push(dot);
                    itineraryLayers[index].markers.push(dot) // save arc to specific group

                    const curve = generateBezierCurve(start.lat, start.lon, end.lat, end.lon, index);
                    fullPathCoords.push(...curve);

                    // Add Directional Arrow at the midpoint of this curve
                    const midIndex = Math.floor(curve.length / 2)
                    const p1 = curve[midIndex - 1]
                    const p2 = curve[midIndex + 1]

                    const bearing = calculateBearing(p1[0], p1[1], p2[0], p2[1])
                    // CSS Rotation 0deg points right (east). subtract 90 from bearing to match CSS layout
                    const cssAngle = bearing - 90

                    const arrowIcon = L.divIcon({
                        className: "route-arrow",
                        html: `<div style="transform: rotate(${cssAngle}deg); color: ${color}; font-size: 14px; text-shadow: 0 0 3px white; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">➤</div>`,
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    })

                    const arrowMarker = L.marker(curve[midIndex], { icon: arrowIcon, interactive: false}).addTo(map)
                    currentMapLayers.push(arrowMarker)
                    itineraryLayers[index].markers.push(arrowMarker)
                }
            }

            // Create an empty polyline on the map
            const animatedLine = L.polyline([], {
                color: color,
                weight: weight,
                opacity: opacity,
                dashArray: isCheapest ? null : '5, 5' // Make alternative routes dashed!
            }).addTo(map);

            // create invisible hitbox for mobile fat-finger clicks
            const hitboxLine = L.polyline(fullPathCoords, {
                color: "transparent",
                weight: 25, // thick 25px invisible line
                opacity: 0
            }).addTo(map)

            // cross-trigger the UI card click when either line is tapped
            const onMapArcClick = () => {
                const targetCard = document.getElementById(`itinerary-card-${index}`)
                if (targetCard) {
                   // scroll sidebar to card smoothly
                   targetCard.scrollIntoView({ behavior: "smooth", block: "center" }) 

                   // Programmaticaly click it to trigger existing logic
                   targetCard.click()
                }
            }

            animatedLine.on("click", onMapArcClick)
            hitboxLine.on("click", onMapArcClick)

            // Link the hitbox to the visible line so they can be visually layered together
            animatedLine._hitbox = hitboxLine
            
            currentMapLayers.push(animatedLine, hitboxLine);
            itineraryLayers[index].lines.push(animatedLine) //save line to specific group

            // NATIVE ANIMATION: Draw the line point-by-point!
            let pointIndex = 0;
            function drawNextPoint() {
                if (pointIndex < fullPathCoords.length) {
                    animatedLine.addLatLng(fullPathCoords[pointIndex]);
                    pointIndex++;
                    // Using setTimeout instead of requestAnimationFrame so we can control the speed
                    setTimeout(drawNextPoint, 10); 
                }
            }
            
            // Stagger the start times slightly so they look like they are racing
            setTimeout(drawNextPoint, index * 200); 
        });
    }

    // fly map first, wait for movement to finish, then draw
    if (routeBounds.isValid()) {
        map.flyToBounds(routeBounds, { padding: [50, 50], duration: 1.5 })
        map.once("moveend", startDrawing)
    } else {
        startDrawing()
    }
}

//Updates map styles when user clicks a UI card
function highlightItineraryOnMap(selectedIndex) {
    itineraryLayers.forEach((layerGroup, index) => {
        const isSelected = (index === selectedIndex)

        const color = isSelected ? '#6750A4' : '#9e9e9e'
        const weight = isSelected ? 4 : 2
        const opacity = isSelected ? 1 : 0.4
        const dashArray = isSelected ? "" : '5, 5'

        //updates all lines for this itinerary
        layerGroup.lines.forEach( line => {
            line.setStyle({ color, weight, opacity, dashArray })
            if (isSelected) {
                if (typeof line.bringToFront === "function") line.bringToFront()
                if (line._hitbox && typeof line._hitbox.bringToFront === "function") line._hitbox.bringToFront() // keep hitbox on top
            }
        })

        //updates all dots AND ARROWS for this itinerary
        layerGroup.markers.forEach(marker => {
            if (marker.setStyle) {
                // It's a CircleMarker (layover dot)
                marker.setStyle({ color })
                if (isSelected && typeof marker.bringToFront === "function") marker.bringToFront()
            } else if (marker.getElement()) {
                // It's a DivIcon (Directional Arrow)
                const div = marker.getElement().querySelector("div")
                if (div) div.style.color = color

                // L.Marker does not have bringToFront(), it uses Z-Index offsets
                if (typeof marker.setZIndexOffset === "function") {
                    marker.setZIndexOffset(isSelected ? 1000 : 0)
                }
            }
        })
    })
}

//==================END OF MAP LOGIC==================

// Function: Render Custom Flight Data
function renderFlightData(itineraries, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (!itineraries || itineraries.length === 0) {
        container.innerHTML = `<p>${window.translations[window.currentLang]["js-no-routes"]}</p>`;
        return;
    }

    const userCurrency = getCookie('currency') || 'gbp'
    const userRegion = getCookie('region') || 'uk'
    const localeMap = { 'uk': 'en-GB', 'us': 'en-US', 'es': 'es-ES'}
    const locale = localeMap[userRegion] || 'en-GB'

    const priceFormatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: userCurrency.toUpperCase(),
        minimumFractionDigits: 0, //avoid decimals - keep ui clean
        maximumFractionDigits: 0
    })

    itineraries.forEach((itinerary, index) => {
        //Format the full route path (LGW -> DUB ...)
        const routeString = itinerary.path.map(airportSpan).join(' ➔ ')
        const startDate = itinerary.dates[0]
        const endDate = itinerary.dates[itinerary.dates.length - 1]

        //gen html for each individual flight leg
        const flightDetailsHTML = itinerary.flights.map((flight, flightIndex) => {
            const legDate = itinerary.dates[flightIndex]
            const logoHtml = flight.airline_logo ? `<img src="${flight.airline_logo}" style="width:16px; height:16px; vertical-align: middle; border-radius: 2px; margin-right: 4px; background: white;">` : ""


            return `<div style="display:flex; justify-content:space-between; font-size: 12px; margin-top: 4px; color: var(--md-sys-color-on-surface-variant);">
                        <span style="display:flex; align-items:center;">
                            ${logoHtml} ${legDate} • 
                            ${airportSpan(flight.from)} ➔ 
                            ${airportSpan(flight.to)}
                            (${flight.airline})
                        </span>
                        <span style="font-weight: bold;">${priceFormatter.format(flight.price)}</span>
                    </div>`
        }).join('')

        const flightBlock = document.createElement('div')
        flightBlock.className = 'flight-card'
        flightBlock.id = `itinerary-card-${index}` // unique ID so map arcs can find this card

        // Use the logo of the first flight for the main circular badge, fallback to the index number
        const firstLogo = itinerary.flights[0].airline_logo
        const mainBadgeHtml = firstLogo ? `<img src="${firstLogo}" class="airline-logo" style="object-fit: contain; background: white;" alt="logo">` : `<div class="airline-logo">#${index + 1}</div>`

        flightBlock.innerHTML = `
            ${mainBadgeHtml}
            <div class="flight-info" style="width: 100%;">
                <div class="route">${routeString}</div>
                <div class="details" style="flex-direction: column; width: 100%;">
                    <div style="display:flex; justify-content:space-between; align-items: center; margin-bottom: 6px;">
                        <span class="date">${startDate} to ${endDate}</span>
                        <span class="price" style="font-size: 16px; font-weight: bold;">
                            Total: ${priceFormatter.format(itinerary.totalCost)}
                            <span style="font-size: 12px; font-weight: normal; color: var(--md-sys-color-on-surface-variant); margin-left: 4px;">(all passengers)</span>
                        </span>
                    </div>
                    <div style="border-top: 1px solid var(--md-sys-color-surface-variant); padding-top: 6px; width: 100%;">
                        ${flightDetailsHTML}
                    </div>

                    <div style="display: flex; justify-content: flex-end; margin-top: 12px; border-top: 1px dashed var(--md-sys-color-surface-variant); padding-top: 8px;">
                        <md-filled-tonal-button class="save-itin-btn">
                            <md-icon slot="icon">favorite_border</md-icon>
                            Save Itinerary
                        </md-filled-tonal-button>
                    </div>
                </div>
            </div>`

        // SAVE / UNSAVE Logic
        const saveBtn = flightBlock.querySelector(".save-itin-btn")
        let isSaved = false
        let savedDbId = null
        let savedGuestId = null

        // check if itinerary came from itineraries page
        if (itinerary.itinerary_id) {
            isSaved = true
            saveBtn.innerHTML = "<md-icon slot='icon'>favorite</md-icon> Unsave"

            // Route the ID to the correct variable for the unsave logic
            if (String(itinerary.itinerary_id).startsWith("guest_")) {
                savedGuestId = itinerary.itinerary_id
            } else {
                savedDbId = itinerary.itinerary_id
            }
        }

        saveBtn.addEventListener("click", async (e) => {
            e.stopPropagation() // stops the click from triggering main card selection
            saveBtn.disabled = true

            const authRes = await fetch("auth_status.php")
            const auth = await authRes.json()
            const savedCurrency = getCookie("currency") || "gbp"

            // capture passenger counts directly from the form for persistence
            const adultCount = parseInt(document.getElementById("returnAdult").value) || 1
            const childCount = parseInt(document.getElementById("returnChild").value) || 0

            const itineraryPayload = {...itinerary, currency: savedCurrency, adults: adultCount, children: childCount}

            if (!isSaved) {
                // SAVE ACTION
                if (auth.logged_in) {
                    const res = await fetch("add_itinerary.php", {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json'},
                        body: JSON.stringify(itineraryPayload)
                    })
                    try {
                        const parsed = await res.json()
                        if (parsed.success && parsed.itinerary_id) { savedDbId = parsed.itinerary_id }
                    } catch(err) { console.error("Failed to parse save response", err)}
                } else {
                    let guestTrips = JSON.parse(localStorage.getItem("pista_guest_trips")) || []
                    savedGuestId = "guest_" + Date.now()
                    itineraryPayload.itinerary_id = savedGuestId
                    guestTrips.push(itineraryPayload)
                    localStorage.setItem("pista_guest_trips", JSON.stringify(guestTrips))
                }

                isSaved = true
                saveBtn.innerHTML = "<md-icon slot='icon'>favorite</md-icon> Unsave"
            } else {
                // UNSAVE ACTION
                if (auth.logged_in) {
                    if (savedDbId) {
                        await fetch("delete_itinerary.php", {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json'},
                            body: JSON.stringify({ itinerary_id: savedDbId })
                        })
                    } 
                } else {
                    let guestTrips = JSON.parse(localStorage.getItem("pista_guest_trips")) || []
                    guestTrips = guestTrips.filter(t => t.itinerary_id !== savedGuestId)
                    localStorage.setItem("pista_guest_trips", JSON.stringify(guestTrips))
                }

                isSaved = false
                saveBtn.innerHTML = "<md-icon slot='icon'>favorite_border</md-icon> Save Itinerary"
            }

            saveBtn.disabled = false
        })
        
        flightBlock.addEventListener('click', () => {
            document.querySelectorAll('.flight-card').forEach(card => card.classList.remove('selected'));
            flightBlock.classList.add('selected');
            const clone = flightBlock.cloneNode(true);
            clone.classList.remove('selected'); // To remove the selected styling from the clone

            // Clean up clone so the save button doesn't appear on the Step 3 confirmation screen
            const cloneSaveBtn = clone.querySelector(".save-itin-btn").parentElement
            if (cloneSaveBtn) { cloneSaveBtn.remove() }

            selectedFlight = clone.outerHTML;

            selectedItineraryData = itinerary

            highlightItineraryOnMap(index)
        });

        container.appendChild(flightBlock);
    });
}

// Redirect Listener for Saved Itineraries
document.addEventListener("DOMContentLoaded", async () => {
    // Read the return_to flag set by itineraries.js "Book Now"
    const returnTo = sessionStorage.getItem("return_to")
    if (returnTo) {
        sessionStorage.removeItem("return_to")
    }

    const savedMapItin = sessionStorage.getItem("view_map_itinerary")
    if (savedMapItin) {
        isViewingSavedTrip = returnTo === "itineraries"
        const parsedItin = JSON.parse(savedMapItin)

        // clear sessionStorage so page refresh doesn't replay the animation
        sessionStorage.removeItem("view_map_itinerary")

        // jump straight to Step 2 to hide the search form
        showStep(1)

        // Render the itinerary in the sidebar
        renderFlightData([parsedItin], "step2db")

        // visually mark the flight card as selected
        const renderedCard = document.querySelector("#step2db .flight-card")
        if (renderedCard) renderedCard.classList.add("selected")

        // SET selectedItineraryData so deep links use saved passenger counts
        selectedItineraryData = parsedItin
        selectedFlight = "saved_trip_placeholder"

        // wrap in an array because the function expects an array of itineraries
        await animateItinerariesOnMap([parsedItin])

        // highlight the single itinerary so it receives the bold/solid styling instead of the translucent dashed styling
        highlightItineraryOnMap(0)

        // If flagged by "Book Now", auto-advance straight to the booking deep-links view
        const autoBook = sessionStorage.getItem("auto_book")
        if (autoBook) {
            sessionStorage.removeItem("auto_book")

            // Build the Step 3 booking hub exactly as the manual flow does
            const step3Container = document.getElementById("step3db")
            step3Container.innerHTML = ""

            const markerId = "722485"
            const lang = window.currentLang || 'en'
            const currency = getCookie("currency") || "gbp"
            const affiliateLang = (lang === "ca") ? "es" : lang

            let hubHtml = `
                <div style="padding: 16px; background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); border-radius: 16px; margin-bottom: 24px; text-align: center;">
                    <h3 style="margin: 0 0 8px 0; font-size: 18px;">Ready to Book?</h3>
                    <p style="margin: 0; font-size: 14px; opacity: 0.9;">To secure these prices, book each leg below. We recommend opening them in new tabs.</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;">`

            parsedItin.flights.forEach((flight, index) => {
                const legDate = flight.date || (parsedItin.dates ? parsedItin.dates[index] : "")
                const origin = flight.from
                const dest = flight.to

                let formattedDate = ""
                if (legDate) {
                    const parts = legDate.split("-")
                    if (parts.length === 3) {
                        formattedDate = `${parts[2]}${parts[1]}`
                    } else {
                        const d = new Date(legDate)
                        formattedDate = String(d.getDate()).padStart(2, "0") + String(d.getMonth() + 1).padStart(2, "0")
                    }
                }

                const adults = parsedItin.adults ?? 1
                const children = parsedItin.children ?? 0
                const passengerString = parseInt(children) > 0 ? `${adults}${children}` : `${adults}`
                const deepLink = `https://www.aviasales.com/search/${origin}${formattedDate}${dest}${passengerString}?marker=${markerId}&currency=${currency.toLowerCase()}`

                const logoHtml = flight.airline_logo
                    ? `<img src="${flight.airline_logo}" style="width:28px; height:28px; border-radius: 4px; background: white; object-fit: contain;">`
                    : `<md-icon style="font-size:28px; color: var(--md-sys-color-primary);">flight</md-icon>`

                hubHtml += `
                    <div style="border: 1px solid var(--md-sys-color-surface-variant); border-radius: 12px; padding: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: white;">
                        <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                            ${logoHtml}
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-weight: bold; font-size: 14px; color: var(--md-sys-color-on-surface);">${origin} ➔ ${dest}</span>
                                <span style="font-size: 12px; color: var(--md-sys-color-on-surface-variant);">${legDate} • ${flight.airline}</span>
                            </div>
                        </div>
                        <md-filled-button onclick="window.open('${deepLink}', '_blank')" style="--md-filled-button-container-height: 36px; font-size: 13px;">
                            <md-icon slot="icon" style="font-size: 16px;">open_in_new</md-icon> Book
                        </md-filled-button>
                    </div>`
            })

            hubHtml += "</div>"
            step3Container.innerHTML = hubHtml

            // Hide the confirm button (same as manual flow)
            const step3Div = document.getElementById("step3")
            const confirmBtn = step3Div.querySelector(".next-btn")
            if (confirmBtn) confirmBtn.style.display = "none"

            showStep(2) // Step 3 is index 2 in the steps array
        }
    }
})