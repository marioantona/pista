# Security work

An audit in August 2026 produced a list of findings, and the rule for working through it was:
**reproduce it first, fix it in layers (least risky first), then show the reproduction no longer
works.** A fix that can't be shown to close the hole is a guess.

Each entry below is a finding, how it was confirmed, the fix, and the evidence.

---

### A forgeable guest quota

- **Found.** Guest credits were keyed on Cloudflare's `CF-Connecting-IP` header, but the origin
  also accepted connections that hadn't come through Cloudflare. So anyone could send the header
  themselves and claim a fresh guest identity on every request.
- **Reproduced.** Two forged headers sent straight to the origin created two guest rows, keyed to
  documentation-range addresses.
- **Fixed, in three layers:**
  - Apache's `mod_remoteip` accepts the header only from Cloudflare's 15 published ranges.
  - A single PHP helper (`webroot/client_ip.php`) returns the validated address. Reading the raw
    header anywhere else fails an automated check.
  - The host firewall, and the cloud provider's network rules, admit web traffic only from
    Cloudflare. The first two layers closed the bypass on their own, before the firewall was touched.
- **Verified.** Direct-to-origin requests now time out where they returned 200. A monthly
  report-only job checks that the ranges haven't drifted and that the rewrite is still happening.

### Credits charged six times for the price of one

- **Found.** The deduction read the balance, then wrote it: the classic race.
- **Reproduced.** Six parallel searches on a throwaway account with 4 credits all ran, and the
  balance went from 4 to 2.
- **Fixed.** The condition moved into the `UPDATE`'s `WHERE` clause, with affected rows deciding
  the outcome. Guests have no row on their first search, so they get an insert, with a duplicate-key
  error deciding between two parallel first searches.
- **Verified.** The same six-way test charges exactly twice and ends at 0.

### A paid search that wasn't paid for

- **Found.** Charging (PHP) and searching (Node) were separate requests. Node authenticated
  nothing, so calling it directly skipped the charge entirely.
- **Fixed.** A single-use, 120-second, HMAC-signed token, minted only after charging and checked by
  Node: constant-time comparison, scope, expiry and a replay cache. It was rolled out log-only first
  and enforced once the access log showed no visitor still running old code. The internal
  verification route is also denied at the proxy, case-insensitively, because a probe showed
  Express's case-insensitive routing slipping past a case-sensitive rule.
- **Verified.** A tokenless request with a valid body gets 401, and no search starts.
- **And then:** a token proved payment, not *size*. One credit could still buy a verification with
  hundreds of legs. Verification now builds its request from the database and caps it at 11 legs.
  Searches are priced by their measured worst case, and the token carries the size that was paid
  for.

### A password-reset link built from the attacker's `Host` header

- **Found.** The reset email's link was built from `$_SERVER['HTTP_HOST']`, which the client
  controls. A poisoned header would have emailed a valid reset token to the attacker's domain.
- **Fixed.** Built from configuration instead. Using `HTTP_HOST` anywhere in the PHP now fails an
  automated check.
- **Also closed.**
  - Account enumeration: the reset endpoint gives the same response whether or not the address
    exists, including when the mail send fails.
  - A login timing side channel.

### Rate limiting that fails in the right direction

- **Login:** 5 failures per address and 10 per IP per 15 minutes; only failures count; HTTP 429.
  **It fails open**: if the limiter's table is unavailable, logins still work. Locking everyone out
  is worse than briefly losing the limit.
- **Password reset:** 3 per address and 10 per IP per hour; every request counts. **It fails closed**,
  and the response when throttled is byte-identical to a normal one, so the limiter can't reveal
  whether an account exists.
- **Verified** by renaming the table away and showing each failure mode.

### Least privilege

- **Database.** The application's database user held `ALL PRIVILEGES ON *.* WITH GRANT OPTION`. An
  inventory came first: 43 statements, four verbs, one database. The grant became exactly those four
  verbs on that one database. The one `TRUNCATE` became a `DELETE`, because `TRUNCATE` needs the
  `DROP` privilege. DDL in application code now fails an automated check.
- **Network.** Node and the database listen on loopback only, and Node is reachable only through the
  proxy.

### Sessions

One file creates every session and every cookie:
- `Secure`, `HttpOnly`, `SameSite=Lax` and strict mode, with the session ID regenerated at login;
- a full cookie teardown on logout;
- real "remember me" tokens (selector and validator, rotated, with theft detection on reuse);
- an idle timeout for sessions that weren't remembered;
- a password reset invalidates every other session.

A single function answers "who is logged in", and reading the session's user ID anywhere else fails
an automated check. Before that rule existed, 17 files each answered the question for themselves,
and none of them could honour a password-reset revocation.

### Output escaping and error handling

- **Escaping.** Escaping moved from database writes to output, applied at every sink: `innerHTML`,
  `src`/`href` (where escaping alone still allows `javascript:`), Leaflet popups, and an inline
  handler. An audit found worse than the one line originally reported.
- **OAuth errors.** The OAuth callback used to print internals to the browser, in one case the
  provider's whole token response. Failures now log narrowly (provider, status and error code; never
  a body, token or code) and show a generic message.

---

## The credentials in the history

The worst finding was one I made myself.

- **What happened.** Early in the project, before there was a `.gitignore`, credentials were
  committed to the private repository: environment files, OAuth secrets, an SMTP key, and the
  server's SSH key.
- **The response.** All were rotated. In October 2026, a hash comparison of every secret-shaped value
  in the history against the live configuration confirmed that nothing in the history still works.
- **What it shaped.** That history is why this public repository isn't a copy or a filtered version
  of the private one. A filter is only as good as its inventory of what to remove, and that inventory
  had been wrong once already: a document said the key files had never been tracked, and they had
  been.
- **What happens instead.** Each public commit is *replayed* from the private one: allowlisted files
  only, scanned for secret patterns *and* for every value ever committed as a secret, then committed
  fresh. Then the whole public repository is scanned again before anything is pushed.
- **The lesson.** Secrets go in environment variables from the first commit, and `.gitignore`
  arrives before anything else does.
