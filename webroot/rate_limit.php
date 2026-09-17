<?php
// Fixed-window rate limiting on the rate_limits table. Guarded so it is safe to
// require from any file, in any order, any number of times.
//
// Every function takes the mysqli $conn that configure.php creates and LETS
// EXCEPTIONS PROPAGATE. Callers catch \Throwable, not just mysqli_sql_exception:
// a missing table throws the latter, a closed connection throws a plain Error.
// Propagating is deliberate: what to do when the limiter itself is broken is a
// policy decision, and it differs by endpoint (RUNBOOK §17).
// login.php catches and carries on -- a database blip must not lock everyone out.
// forgot_password.php catches and refuses -- protecting the Brevo allowance beats
// the availability of a flow whose token lasts 30 minutes anyway. Keeping that
// choice in the two callers keeps the asymmetry visible where it matters.
//
// Usage is check-then-hit: pista_rate_limited() first, pista_rate_hit() when the
// request should count. With a limit of N, exactly N requests pass per window.
//
// Fixed window, not sliding: a sliding window needs an append-only log and a
// sweep, for precision these thresholds do not need.

if (!function_exists('pista_rate_limited')) {

    // Email buckets are keyed on a hash, so the raw address never enters the
    // table. Lower-cased first: users.email is utf8mb4_general_ci, so Foo@x and
    // foo@x are the same account and must share one budget.
    function pista_rate_email_key(string $email): string
    {
        return hash('sha256', strtolower(trim($email)));
    }

    // True if the bucket's CURRENT window already holds $limit or more. Reads only.
    // A row whose window has expired counts as empty.
    function pista_rate_limited(mysqli $conn, string $bucket, int $limit, int $windowSeconds): bool
    {
        $stmt = $conn->prepare(
            "SELECT attempts FROM rate_limits
             WHERE bucket = ? AND window_start > NOW() - INTERVAL ? SECOND"
        );
        $stmt->bind_param("si", $bucket, $windowSeconds);
        $stmt->execute();
        $stmt->bind_result($attempts);
        $found = $stmt->fetch();
        $stmt->close();

        return $found && $attempts >= $limit;
    }

    // Count one request against the bucket, starting a fresh window if the old
    // one has expired. One atomic statement, so concurrent requests cannot lose
    // each other's increments.
    function pista_rate_hit(mysqli $conn, string $bucket, int $windowSeconds): void
    {
        // ASSIGNMENT ORDER IS LOAD-BEARING. MariaDB applies ON DUPLICATE KEY UPDATE
        // assignments left to right, and a later one sees the earlier results.
        // `attempts` must be computed while window_start still holds the OLD value.
        // Swap the two lines and window_start becomes NOW() first, the expiry test
        // on `attempts` can never be true, and the count is never reset -- a
        // lockout that lasts forever.
        $stmt = $conn->prepare(
            "INSERT INTO rate_limits (bucket, attempts, window_start) VALUES (?, 1, NOW())
             ON DUPLICATE KEY UPDATE
                 attempts     = IF(window_start <= NOW() - INTERVAL ? SECOND, 1, attempts + 1),
                 window_start = IF(window_start <= NOW() - INTERVAL ? SECOND, NOW(), window_start)"
        );
        $stmt->bind_param("sii", $bucket, $windowSeconds, $windowSeconds);
        $stmt->execute();
        $stmt->close();

        // Opportunistic cleanup instead of a cron job. The longest window is an
        // hour, so anything a day old is dead weight. 1 in 50 keeps it cheap.
        if (random_int(1, 50) === 1) {
            $conn->query("DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL 1 DAY");
        }
    }

    function pista_rate_clear(mysqli $conn, string $bucket): void
    {
        $stmt = $conn->prepare("DELETE FROM rate_limits WHERE bucket = ?");
        $stmt->bind_param("s", $bucket);
        $stmt->execute();
        $stmt->close();
    }
}
?>
