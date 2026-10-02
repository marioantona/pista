# Architecture

## Two backends, one rule

| | Owns | Never does |
|---|---|---|
| **PHP** (`webroot/*.php`) | Identity, sessions, the database, credits | Call the flight API |
| **Node / Express** (`pista-api/`) | The beam search and every outbound flight-API call | Connect to the database |

Splitting by responsibility keeps the expensive, slow part (route search against a paid API) away
from the part that has to be correct (who you are, what you've paid). The cost of the split is that
the two can't share state, so **they meet only through signed messages**. That constraint is behind
most of the interesting design below.

Node and the database both listen on loopback only. Node is reachable solely through Apache's
`/api` reverse proxy, and web traffic reaches the origin only through Cloudflare, whose client-IP
header is validated by Apache against Cloudflare's published ranges before PHP ever reads it.

## A search, end to end

1. **The form prices itself.** `search_cost.js` computes the credit cost from the number of
   destinations and must-visits as you type (see [ALGORITHM.md](ALGORITHM.md) for where the numbers
   come from).
2. **Validate before charging.** `index.js` runs the same bounds Node will enforce: 1–10
   destinations, 1–20 days, at most 9 passengers, inside the booking horizon. A doomed search never
   costs credits.
3. **PHP charges, atomically.** `check_quota.php` recomputes the price itself, with the browser's
   figure ignored, and deducts it with a conditional `UPDATE … WHERE credits_remaining >= ?`. Then it
   mints a token.
4. **The token** (`api_token.php` → `pista-api/apiToken.js`) is HMAC-signed, single-use and lives 120
   seconds. Its payload contains:
   - `jti`, a random id;
   - `sub`, the user or a hashed guest key;
   - `scope`, `search` or `verify`;
   - the search's size (`n`, `d`) and the credits charged (`cr`).
5. **Node verifies.** A constant-time comparison (`timingSafeEqual`), then the scope, then expiry,
   then an in-memory replay cache keyed on `jti`. A search larger than the one paid for is refused.
   During a key rotation, a second secret is accepted. *The replay cache is in-process, which is why
   Node must run as a single process; the code says so where the cache is defined.*
6. **The search runs** and returns itineraries; the browser renders cards and draws routes on a
   Leaflet map.
7. **If it fails**, Node returns a **signed refund receipt** (`jti`, subject, credits, calls spent).
   `refund.php` verifies it and claims the `jti` as a primary key — so each receipt pays out once —
   with a cap of 3 refunds per month. The browser can't fake a failure, because only Node knows the
   outcome.

Price verification of a saved trip is the one place PHP calls Node directly. `verify_itinerary.php`
builds the request **from the database** — legs, currency, passengers — never from the request
body, and caps it at 11 legs before charging. An earlier version trusted a client-supplied list of
legs, which let one credit buy an unbounded number of API calls.

## Data model

`deploy/schema.sql` is the reference copy. Ten tables:

| Table | Holds |
|---|---|
| `users` | Account, password hash, OAuth identity, credit balance, `sessions_valid_after` (a password reset invalidates every older session) |
| `details`, `preferences` | Optional profile fields; region, currency, distance unit |
| `itineraries`, `flights` | Saved trips and their legs, including the previous price for "has this changed?" |
| `guest_usage` | Guest credits, keyed on the validated client IP; cleared monthly |
| `rate_limits` | Login, sign-up and reset attempt counters, keyed on IP and on a hash of the email |
| `refunds` | One row per redeemed receipt; `jti` is the primary key |
| `remember_tokens` | Selector/validator "remember me" tokens with rotation and theft detection |
| `account_tombstones` | Stops delete-and-recreate from refilling credits (hashes only) |

The application's database user holds `SELECT, INSERT, UPDATE, DELETE` on this one database and
nothing else. Schema changes are made by hand, out of band.

## Sessions and auth

- One file, `webroot/session.php`, starts every session and sets every cookie: `Secure`, `HttpOnly`,
  `SameSite=Lax`, strict mode. **`Lax`, not `Strict`**, because `Strict` withholds the session cookie
  on the OAuth callback and breaks every OAuth login.
- One function, `pista_current_user()` in `auth.php`, answers "who is logged in". It is the only way
  to honour password-reset revocation, resume a remember-me token, and enforce the 30-minute idle
  timeout for sessions that weren't remembered.
- Sign-in is by email and password (bcrypt), or with Google or Microsoft, using the OAuth code flow
  with a state check.

## Frontend

Plain HTML, CSS and JavaScript, served as written; there's no build step. Material Web Components
for the controls, Leaflet for the map. Everything interpolated into HTML goes through
`escapeHtml()`, and every URL through `safeUrl()` (`webroot/escape.js`). Text is translated into
English, Spanish and Catalan by walking `data-i18n` attributes. Every local asset is requested under
a single release token, so a deploy reaches returning visitors immediately.
