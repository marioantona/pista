// X-PISTA-Token verification -- the Node half of the HMAC handshake (RUNBOOK §17).
//
// PHP charges a credit, then mints a short-lived, single-use token. Node refuses
// to do any work without one. Without this, anyone could POST straight to
// /api/search-flights and get a full beam search without ever paying a credit.
//
// Wire format (minted by webroot/api_token.php):
//
//   v1.<base64url(payload)>.<base64url(HMAC-SHA256(secret, "v1.<base64url(payload)>"))>
//   payload = {"jti","sub","scope":"search"|"verify","iat","exp"}
//
// The MAC covers the exact string "v1.<b64>" as transmitted, not re-serialised
// JSON, so PHP and JS never need to agree on how to produce identical JSON, and
// the version prefix is itself authenticated.
//
// The secret never travels. The third segment is the HMAC OUTPUT; the secret is
// the key. Both sides hold it privately.
//
// The payload is NOT bound to the search parameters: index.js calls
// check_quota.php before it builds them, so PHP never sees them. The token proves
// payment, not size -- requestLimits.js bounds the size. The original reason given
// here, that main.js's predictor caps ANY search at 20 calls, was wrong: it floors
// the beam at 1 and overspends when the budget cannot fit (RUNBOOK §11). Binding
// the destination counts is part of the complexity-priced-searches roadmap item.

const crypto = require('crypto')

const MAX_LIFETIME_SECONDS = 120
const REPLAY_CACHE_MAX = 10000

// Current secret first. PISTA_API_SECRET_PREVIOUS exists only during rotation, so
// tokens PHP minted with the old secret still verify while the two sides restart
// one after the other. Remove it once both use the new one.
function configuredSecrets() {
    return [process.env.PISTA_API_SECRET, process.env.PISTA_API_SECRET_PREVIOUS]
        .filter(s => typeof s === 'string' && s.length > 0)
}

function enforcing() {
    return process.env.TOKEN_ENFORCE === 'true'
}

// Separate switch for the n/d size claims, so the staged rollout of complexity
// pricing has its own one-variable rollback and cannot disturb the token guard
// itself. Off => a token with no claims (an older check_quota.php, or a client
// holding a cached script) is accepted and the mismatch only logged.
function bindEnforcing() {
    return process.env.TOKEN_BIND_ENFORCE === 'true'
}

// ---------------------------------------------------------------------------
// Replay cache.
//
// 🔴 PER-PROCESS. This is why PM2 must stay in FORK mode (see server.js). Under
// cluster mode each worker would hold part of the picture and a replayed token
// would succeed whenever it landed on a different worker -- roughly half the time.
//
// A restart empties it, so a token captured just before a deploy could be replayed
// once afterwards, within its 120 seconds: at most one extra search. Accepted.
//
// Node cannot reach MariaDB, and that boundary is not worth crossing for a
// 120-second set. Nor is Redis, a whole daemon for one ephemeral set.
// ---------------------------------------------------------------------------
const seen = new Map() // jti -> exp (unix seconds)

function sweep(now) {
    for (const [jti, exp] of seen) {
        if (exp <= now) seen.delete(jti)
    }
}

// Returns null if the token is valid (and records its jti), or a short reason.
function checkToken(token, scope, now = Math.floor(Date.now() / 1000)) {
    if (typeof token !== 'string' || token.length === 0) return 'missing'

    const parts = token.split('.')
    if (parts.length !== 3 || parts[0] !== 'v1') return 'malformed'

    const signingInput = `${parts[0]}.${parts[1]}`
    const presented = Buffer.from(parts[2], 'base64url')

    // timingSafeEqual, never ===. A plain comparison returns at the first differing
    // byte, which leaks how much of a forged MAC was right. It also THROWS on a
    // length mismatch, so the length is checked first.
    const macOk = configuredSecrets().some(secret => {
        const expected = crypto.createHmac('sha256', secret).update(signingInput).digest()
        return presented.length === expected.length && crypto.timingSafeEqual(presented, expected)
    })
    if (!macOk) return 'bad-signature'

    // Only parse what has already been authenticated.
    let payload
    try {
        payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    } catch {
        return 'malformed-payload'
    }
    const { jti, scope: tokenScope, iat, exp } = payload || {}

    if (typeof jti !== 'string' || !Number.isInteger(iat) || !Number.isInteger(exp)) return 'malformed-payload'
    if (tokenScope !== scope) return 'wrong-scope'
    if (iat > now + 5) return 'not-yet-valid' // 5 s of slack; both sides share one clock
    if (exp <= now) return 'expired'
    if (exp - iat > MAX_LIFETIME_SECONDS) return 'lifetime-too-long'

    sweep(now)
    if (seen.has(jti)) return 'replay'
    if (seen.size >= REPLAY_CACHE_MAX) return 'replay-cache-full' // unreachable without ~10k paid credits
    seen.set(jti, exp)

    return null
}

// Express middleware. Mounted BEFORE body validation, so an unpaid request costs
// nothing beyond this check.
function requireToken(scope) {
    return (req, res, next) => {
        const token = req.get('X-PISTA-Token')
        const reason = checkToken(token, scope)

        if (reason === null) {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
            // The payload is authenticated by here, so the route may trust its
            // claims -- n and d cap how large the paid-for search may be.
            req.pistaToken = payload
            // Log the subject and a jti prefix only -- never the token itself.
            console.log(`[TOKEN] ${scope} valid sub=${payload.sub} jti=${payload.jti.slice(0, 8)} n=${payload.n ?? '-'} d=${payload.d ?? '-'}`)
            return next()
        }

        if (!enforcing()) {
            // Staged rollout: record what WOULD have been refused, refuse nothing.
            console.log(`[TOKEN] ${scope} ${reason.toUpperCase()} (log-only, allowed)`)
            return next()
        }

        console.log(`[TOKEN] ${scope} ${reason.toUpperCase()} (rejected)`)
        return res.status(401).json({
            success: false,
            error: 'Your search session expired. Please try again.'
        })
    }
}

module.exports = { requireToken, checkToken, bindEnforcing, _seen: seen }
