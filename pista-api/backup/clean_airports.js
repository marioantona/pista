const fs = require('fs');

// 1. Load the new JSON array
const rawData = require('./raw_airports.json'); 

// Native JavaScript translator for Country Codes (e.g., "MH" -> "Marshall Islands")
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

const cleanDatabase = {};

// Loop directly through the array
rawData.forEach(airport => {
    // 2. FILTER: Must have an IATA code
    if (!airport.iata || airport.iata.trim() === "") return;

    // 3. FILTER: Must be an active, standard airport (no closed, heliports, or seaplanes)
    if (airport.status !== 1) return;
    if (airport.type !== 'airport') return;

    // 4. FILTER: Must have coordinates for our distance math!
    if (!airport.lat || !airport.lon) return;

    // (Optional) If you want to be super strict and ignore tiny grass strips, 
    // uncomment the next line:
    // if (airport.size === 'small') return;

    try {
        // 5. TRANSLATE: Convert the 'iso' code to the full country name
        let fullName = regionNames.of(airport.iso);

        // Build the clean object, keyed by the IATA code
        cleanDatabase[airport.iata] = {
            country: fullName,
            lat: parseFloat(airport.lat),
            lon: parseFloat(airport.lon)
        };
    } catch (e) {
        // Silently skip if the 'iso' code is somehow missing or invalid
    }
});

// 6. Save the optimized file
fs.writeFileSync('./clean_airports.json', JSON.stringify(cleanDatabase, null, 2));

console.log(`✅ Cleaned! Reduced from ${rawData.length} total entries down to ${Object.keys(cleanDatabase).length} useful airports.`);