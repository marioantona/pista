#!/usr/bin/env bash
# Cloudflare trust check. REPORTS ONLY -- it never edits the firewall or Apache.
#
# Two properties, both of which fail SILENTLY in production if they break:
#
#   1. The iptables CLOUDFLARE chain still matches Cloudflare's published ranges.
#      Cloudflare adds ranges occasionally. A stale allowlist fails CLOSED: real
#      visitors from a new range are dropped, and the symptom is "the site is down
#      for some people", which is exactly the kind of thing nobody diagnoses quickly.
#
#   2. mod_remoteip is actually rewriting REMOTE_ADDR. If the module or
#      conf-available/pista-cloudflare.conf were lost in an upgrade, Apache would
#      log and hand PHP the Cloudflare edge address instead of the visitor's. Every
#      guest on earth would then collapse into a single guest_usage row and the
#      guest quota would silently become one search for the whole internet.
#
# It deliberately does NOT auto-apply new ranges. That would give an external HTTP
# response write access to the firewall: a truncated, empty or hijacked fetch
# becomes an outage or an opening, unattended, at 3am. A human reads the report.
#
# Cron: monthly, ubuntu crontab, logging to ~/pista-scripts/cf_range_check.log
# Exit 0 = both properties hold. Exit 1 = something needs a human.

set -uo pipefail

CF_URL="https://www.cloudflare.com/ips-v4"
ACCESS_LOG="/var/log/apache2/other_vhosts_access.log"
SITE="https://pistaflights.com"
FAILED=0

log() { echo "[$(date -Is)] $*"; }

log "starting Cloudflare trust check"

# ---------------------------------------------------------------------------
# 1. Published ranges vs the applied chain
# ---------------------------------------------------------------------------
published="$(curl -fsS --max-time 20 "$CF_URL" 2>/dev/null)"
if [ -z "$published" ]; then
    log "[ERROR] could not fetch $CF_URL -- skipping the range comparison"
    log "[ERROR] this is NOT a range mismatch; the firewall was not inspected against a list"
    FAILED=1
else
    # awk 'NF', never `wc -l` or a bare `while read`: cloudflare.com/ips-v4 serves its
    # LAST LINE WITHOUT A TRAILING NEWLINE. wc -l undercounts by one and read drops
    # 131.0.72.0/22 entirely. That bug produced a 14-of-15 allowlist during Phase 0B
    # item 4 and would have locked out real visitors.
    published_sorted="$(printf '%s\n' "$published" | awk 'NF' | sort)"
    count="$(printf '%s\n' "$published_sorted" | grep -c .)"

    # Sanity-gate the response before trusting it enough to compare against.
    # A garbage or truncated fetch must read as "could not check", not as drift.
    bad_lines="$(printf '%s\n' "$published_sorted" \
        | grep -vcE '^[0-9]{1,3}(\.[0-9]{1,3}){3}/[0-9]{1,2}$')"
    if [ "$count" -lt 10 ] || [ "$bad_lines" -ne 0 ]; then
        log "[ERROR] $CF_URL returned implausible content ($count lines, $bad_lines malformed)"
        log "[ERROR] refusing to compare against it -- treat as 'not checked', not as drift"
        FAILED=1
    else
        applied="$(sudo iptables -S CLOUDFLARE 2>/dev/null \
            | sed -n 's/^-A CLOUDFLARE -s \([0-9./]*\) -j ACCEPT$/\1/p' | sort)"
        if [ -z "$applied" ]; then
            log "[ERROR] the iptables CLOUDFLARE chain is missing or empty"
            FAILED=1
        elif [ "$applied" = "$published_sorted" ]; then
            log "[OK] iptables CLOUDFLARE chain matches all $count published ranges"
        else
            log "[ERROR] range drift -- iptables does not match $CF_URL"
            log "  only in Cloudflare's list (visitors from these are being DROPPED):"
            comm -13 <(printf '%s\n' "$applied") <(printf '%s\n' "$published_sorted") | sed 's/^/    + /'
            log "  only in iptables (no longer Cloudflare's, allowed in error):"
            comm -23 <(printf '%s\n' "$applied") <(printf '%s\n' "$published_sorted") | sed 's/^/    - /'
            log "  fix by hand, then: sudo netfilter-persistent save"
            log "  remember to update /etc/apache2/conf-available/pista-cloudflare.conf too"
            FAILED=1
        fi
    fi
fi

# ---------------------------------------------------------------------------
# 2. Is mod_remoteip still rewriting?
# ---------------------------------------------------------------------------
# Request the site from this host, going out to Cloudflare and back in. The access
# log should therefore record THIS SERVER's public IP as the client. If it records a
# Cloudflare address instead, the header is no longer being translated.
my_ip="$(curl -fsS --max-time 15 -4 https://api.ipify.org 2>/dev/null)"
mark="cf-range-check-$$-$(date +%s)"

if [ -z "$my_ip" ]; then
    log "[WARN] could not determine this host's public IP -- skipping the mod_remoteip check"
else
    curl -fsS --max-time 20 -o /dev/null "$SITE/index.html?$mark" 2>/dev/null
    sleep 2
    logged="$(sudo grep -F "$mark" "$ACCESS_LOG" 2>/dev/null | tail -1 | awk '{print $2}')"

    if [ -z "$logged" ]; then
        log "[WARN] test request did not appear in $ACCESS_LOG -- could not verify mod_remoteip"
    elif [ "$logged" = "$my_ip" ]; then
        log "[OK] mod_remoteip is rewriting REMOTE_ADDR (logged the true client, not the edge)"
    else
        log "[ERROR] mod_remoteip is NOT rewriting: logged '$logged', expected '$my_ip'"
        log "  a Cloudflare edge address here means every guest shares one guest_usage row"
        log "  check: apache2ctl -M | grep remoteip; a2enconf pista-cloudflare"
        FAILED=1
    fi
fi

if [ "$FAILED" -ne 0 ]; then
    log "Cloudflare trust check FAILED -- needs a human"
    exit 1
fi

log "Cloudflare trust check complete, both properties hold"
