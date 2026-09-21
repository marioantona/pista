// Ghost Sync -- draining the trips a guest saved before they had an account.
//
// This used to live in itineraries.js and fire on DOMContentLoaded, which meant
// a guest's trips migrated only if they happened to open Saved Trips. Sign up,
// go back to searching, and they sat in localStorage indefinitely. It belongs on
// the login path, which is where index.js now calls it -- covering the modal
// login, the OAuth return and a remember-token resume alike. itineraries.js
// still calls it too, so landing straight on Saved Trips loses nothing; the
// difference is that it is no longer the only trigger.
//
// The old loop also destroyed data. It awaited every POST, ignored every
// response, then cleared localStorage unconditionally -- so a trip the server
// refused was gone. This one reads the answer.

const STORAGE_KEY = "pista_guest_trips"

export async function syncGuestTrips() {
    let pending = []
    try {
        pending = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
    } catch (e) {
        return 0 // unparseable: leave it alone rather than destroy it
    }
    if (!Array.isArray(pending) || pending.length === 0) return 0

    const keep = []
    let stored = 0

    for (const trip of pending) {
        try {
            const res = await fetch("add_itinerary.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(trip)
            })
            const parsed = await res.json()

            if (parsed.success) {
                stored++
            } else if (res.status === 422) {
                // The server understood the trip and refused it, so retrying can
                // only fail again -- dropping it is the only thing that does not
                // leave a doomed request in the queue forever. 422 specifically:
                // a 401 (session expired mid-sync) or a 500 is not an answer
                // about the trip, and falls through to keep.
                console.error("Guest trip refused and discarded:", parsed.error)
            } else {
                keep.push(trip)
            }
        } catch (err) {
            // No answer at all -- network, parse, anything. Keep it.
            console.warn("Guest trip could not be synced; keeping it for next time", err)
            keep.push(trip)
        }
    }

    if (keep.length === 0) {
        localStorage.removeItem(STORAGE_KEY)
    } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(keep))
    }

    return stored
}
