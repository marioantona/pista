# Changelog

What happened, phase by phase. Everything from **15 September 2026** onwards is also in this
repository's commit history, replayed from the private repository; what came before is summarised
here (see the README for why).

The phases are not in alphabetical order because the project changed priority partway through. After
the features came a full audit, and since PISTA is a CV link, **security, correctness, mobile and
credibility (Phases 0A–0E) were put ahead of new features**. A security hole or a page of false claims
costs more than a missing feature.

---

## Phase 0E — credibility · 23 September 2026 onwards

**Session 1 — the pages a stranger reads.**
- The help page had been a generic travel-agency FAQ: payments, PayPal, "My Bookings", SMS alerts —
  none of which PISTA does. It was rewritten against the code, every claim checked against the line
  that makes it true, in English, Spanish and Catalan.
- The privacy policy and terms were written properly, in all three languages. The privacy policy
  promises 14-day log retention, and checking that against the server found log rotation had never
  been installed. It was installed before the policy went live.
- Link previews: Open Graph tags and a generated preview image.
- Three more rules became automated checks: every page has a favicon, every translation key exists
  in all three languages, and each legal page has one block per language.

## Phase 0D — mobile · 21–22 September 2026

Five sessions. The first two were done by reading CSS; a real phone then showed they had missed
things, so the last three were done against devices.

- One shared cache-busting release token on every local asset, checked automatically. Fifteen of 20
  asset references had none, so a returning visitor would have seen fixes up to four hours late.
- Inline styles that silently beat the media queries were removed, and the build now fails on one
  inside a responsive row.
- `box-sizing` bugs that put one rounded corner off-screen, found in four places. Two of them were
  in inline styles, which is why an audit of the stylesheets alone had missed them.
- A search card that overflowed only in Firefox: a flex item's `min-width: auto` met Firefox's wider
  date input.
- Then the regression that fix caused, and a check so that bug class can't come back.

## Phase 0C — correctness · 19–21 September 2026

- **Credits are honest.** Atomic deduction: six parallel searches had been charged once between
  them, which was demonstrated before it was fixed. Charge-on-success works by refund, using a
  Node-signed receipt with single-use redemption and a monthly cap.
- **Accounts and sessions.** One answer to "who is logged in". A password reset invalidates other
  sessions. Real remember-me tokens with rotation and theft detection. Account deletion for
  OAuth-only users by re-authentication. The login timing side channel closed.
- **Escaping moved to output**, applied at every sink, with validation on write. An N+1 query was
  replaced by one join.
- **Search quality.** A duplicate-itinerary bug was traced to the beam search paying for the same
  route twice. It was reproduced with zero API calls, fixed at the source and structurally, and
  guarded by a new harness that was shown failing first.

## Phase 0B — security hardening · 4–19 September 2026

Each item was reproduced first where it could be, then fixed in layers, least risky first:

- **Sessions.** One session bootstrap with secure cookie flags. Session IDs regenerated at login.
- **Password reset.** The reset link was built from a client-controlled `Host` header; it now comes
  from configuration. Account enumeration closed.
- **Least-privilege database user.** Narrowed from full global privileges to four verbs on one
  database.
- **Cloudflare IP trust.** The guest quota could be bypassed by forging a header straight to the
  origin, and this was reproduced before the fix. The header is now validated by Apache, and the
  firewall admits web traffic only from Cloudflare.
- **Rate limiting** on login and password reset. One fails closed and one fails open, each for a
  stated reason, and both failure modes were demonstrated.
- **HMAC handshake** between PHP and Node, rolled out log-only before being enforced.
- **Paid-request amplification.** One credit could buy unbounded API calls; it can't any more.
- **Complexity-priced searches**, priced by a measured worst case.
- **OAuth error handling** that no longer prints internals. **CORS** restricted.

## Phase 0 — availability · 3–4 September 2026 (and earlier)

The rebuild path was verified from a clean checkout. Repo and server had drifted apart, which was
found and fixed, and a drift check now runs before deploys. Node was upgraded from 18 (end of life)
to 24 LTS. Retired files left publicly reachable on the server were removed.

## Phase 0A — security remediation · 10–15 August 2026

Credentials moved out of the code into environment variables and rotated. Apache hardened. Node
bound to loopback and its port closed. `.gitignore` added — after, not before, some secrets had
already been committed, which is why this repository's history starts later.

## Phases 1 and 2 — the product · March–June 2026

The beam search and its call-budget predictor, the map and itinerary flow, Aviasales booking links,
IATA autocomplete, guest-to-account sign-up with saved trips that move across on login, Google and
Microsoft sign-in, dark and light themes, and three languages.
