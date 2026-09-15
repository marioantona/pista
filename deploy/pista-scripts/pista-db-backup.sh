#!/usr/bin/env bash
# PISTA — nightly MariaDB backup.
#
# Deploy to:  /home/ubuntu/pista-scripts/pista-db-backup.sh   (chmod 700)
# Cron:       15 3 * * * /home/ubuntu/pista-scripts/pista-db-backup.sh \
#                          >> /home/ubuntu/pista-scripts/db_backup.log 2>&1
#
# Credentials come from an option file, NOT the command line — arguments to
# mysqldump are visible to every user on the box via `ps`.
#
# Retention: 7 daily, plus the Sunday dump kept for 8 weeks.
# Dumps land outside the webroot and are mode 600. They contain email addresses,
# bcrypt hashes and reset-token hashes: treat one as production data.

set -euo pipefail

DB_NAME="pistaDB"
CNF="/home/ubuntu/.pista-backup.cnf"        # 600, owned by ubuntu
DEST="/home/ubuntu/pista-backups"
DAILY="$DEST/daily"
WEEKLY="$DEST/weekly"
KEEP_DAILY=7
KEEP_WEEKLY=8

stamp="$(date +%F_%H%M)"
outfile="$DAILY/${DB_NAME}_${stamp}.sql.gz"

mkdir -p "$DAILY" "$WEEKLY"
chmod 700 "$DEST" "$DAILY" "$WEEKLY"

echo "[$(date --iso-8601=seconds)] starting backup of $DB_NAME"

# --defaults-extra-file MUST be the first argument.
# --single-transaction gives a consistent dump of InnoDB tables without locking
# the application out. --routines/--triggers/--events keep the schema complete.
mysqldump --defaults-extra-file="$CNF" \
  --single-transaction \
  --quick \
  --routines --triggers --events \
  --default-character-set=utf8mb4 \
  "$DB_NAME" | gzip -9 > "$outfile"

chmod 600 "$outfile"

# ── Verify the dump before trusting it ──────────────────────────────────────
# A truncated or failed dump still produces a file. mysqldump writes a
# "Dump completed on" line last, so its presence proves the dump ran to the end.
if ! gunzip -c "$outfile" | tail -5 | grep -q 'Dump completed on'; then
  echo "[$(date --iso-8601=seconds)] FAILED: $outfile has no completion marker" >&2
  mv "$outfile" "$outfile.corrupt"
  exit 1
fi

size="$(stat -c%s "$outfile")"
if [[ "$size" -lt 4096 ]]; then
  echo "[$(date --iso-8601=seconds)] FAILED: $outfile is only ${size} bytes" >&2
  mv "$outfile" "$outfile.suspect"
  exit 1
fi

# ── Promote Sunday's dump to the weekly set ─────────────────────────────────
if [[ "$(date +%u)" == "7" ]]; then
  cp -p "$outfile" "$WEEKLY/"
fi

# ── Rotate ──────────────────────────────────────────────────────────────────
ls -1t "$DAILY"/${DB_NAME}_*.sql.gz  2>/dev/null | tail -n +$((KEEP_DAILY + 1))  | xargs -r rm --
ls -1t "$WEEKLY"/${DB_NAME}_*.sql.gz 2>/dev/null | tail -n +$((KEEP_WEEKLY + 1)) | xargs -r rm --

echo "[$(date --iso-8601=seconds)] ok: $outfile ($((size / 1024)) KiB), $(ls -1 "$DAILY" | wc -l) daily / $(ls -1 "$WEEKLY" | wc -l) weekly retained"
