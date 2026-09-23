#!/usr/bin/env bash
# Regenerates webroot/pictures/og-image.jpg, the 1200x630 link-preview image
# referenced by og:image on index, help, privacy and terms (Phase 0E session 1).
#
# Why a browser and not ImageMagick: the logo's wordmark is SVG <text> in Roboto,
# and ImageMagick without rsvg-convert falls back to its internal renderer, which
# gets the text wrong. The SVG is INLINED (an <img> SVG cannot see page fonts) and
# Roboto comes from Google Fonts, so this needs network access.
#
# Why JPEG: the background is a photograph. The PNG screenshot is ~800 KB, over
# WhatsApp's ~300 KB preview limit; a 256-colour PNG bands the gradient.
#
# Usage: docs/og-image/render.sh        (needs firefox, python3, ImageMagick)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

python3 - "$ROOT" "$WORK" <<'PY'
import sys
root, work = sys.argv[1], sys.argv[2]
svg = open(f'{root}/webroot/pictures/logos/horizontal-dark.svg', encoding='utf-8').read()
svg = svg.replace('viewBox="0 40 1060 300">', 'viewBox="0 40 1060 300" width="880" height="249">', 1)
page = open(f'{root}/docs/og-image/og.html', encoding='utf-8').read()
page = page.replace('@@EARTH@@', f'file://{root}/webroot/pictures/earth.jpg').replace('@@LOGO@@', svg)
open(f'{work}/og.html', 'w', encoding='utf-8').write(page)
PY

mkdir -p "$WORK/profile"
timeout 90 firefox --headless --no-remote --profile "$WORK/profile" \
  --window-size=1200,630 --screenshot "$WORK/og.png" "file://$WORK/og.html"

convert "$WORK/og.png" -alpha off -strip -quality 85 -sampling-factor 4:2:0 \
  -interlace JPEG "$ROOT/webroot/pictures/og-image.jpg"
identify "$ROOT/webroot/pictures/og-image.jpg"
