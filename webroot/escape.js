// Escaping happens HERE, at the point a value becomes HTML -- not on the way
// into the database (Phase 0C session 3).
//
// add_itinerary.php used to run htmlspecialchars() before the INSERT, which had
// two costs. The column stopped holding the truth: an airline called "Flybe & Co"
// was stored as "Flybe &amp; Co", so every non-HTML reader of that row saw a
// corrupted value. And it did not actually stop injection, because the two fields
// that mattered most -- airline_logo here, profile_picture_url in account.js --
// were interpolated straight into src="${...}" and had never been escaped at all.
//
// These two functions are the whole contract. Anything interpolated into an
// innerHTML template literal goes through escapeHtml(); anything landing in a
// src or href attribute goes through safeUrl() as well.

const HTML_ENTITIES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}

// Text, and quoted attribute values. Single quotes are escaped too: this codebase
// writes both style='...' and style="..." and the caller should not have to care.
export function escapeHtml(value) {
    if (value === null || value === undefined) return ''
    return String(value).replace(/[&<>"']/g, ch => HTML_ENTITIES[ch])
}

// URLs going into src/href. Escaping alone stops the attribute being broken out
// of, but leaves "javascript:" and "data:" perfectly valid inside it. Only http
// and https survive; everything else becomes the empty string, which every call
// site here already treats as "no image".
export function safeUrl(value) {
    if (value === null || value === undefined) return ''
    const raw = String(value).trim()
    if (raw === '') return ''
    try {
        const parsed = new URL(raw, window.location.href)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
        return escapeHtml(parsed.href)
    } catch (e) {
        return ''
    }
}
