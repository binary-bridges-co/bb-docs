#!/usr/bin/env bash
# Post-deploy checks against a running site (production or a local container).
#   scripts/verify-deploy.sh https://docs.binarybridges.co
#   scripts/verify-deploy.sh http://localhost:3300
# Exits non-zero on the first class of failure, printing every failed check.
set -uo pipefail

BASE="${1:?usage: verify-deploy.sh <base-url>}"
BASE="${BASE%/}"
FAILURES=0

fail() { echo "  FAIL  $*"; FAILURES=$((FAILURES + 1)); }
pass() { echo "  ok    $*"; }

status() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$BASE$1"; }
header() { curl -sI --max-time 20 "$BASE$1" | tr -d '\r' | grep -i "^$2:" | head -1 | cut -d' ' -f2-; }

echo "== Pages"
for path in / /en/ /sign/ /en/sign/ /sign/api/ /sign/signing/ /en/sign/signing/ /sign/admin/own-certificate/ \
  /sign/legal/terms/ /en/sign/legal/terms/ /sign/developers/quickstart/ /sitemap-index.xml /robots.txt /llms.txt \
  /pagefind/pagefind.js /healthz; do
  code=$(status "$path")
  [ "$code" = "200" ] && pass "200 $path" || fail "$code $path (expected 200)"
done

echo "== Not found"
code=$(status /this-page-does-not-exist-$RANDOM)
[ "$code" = "404" ] && pass "404 for unknown paths" || fail "$code for unknown path (expected 404)"
body=$(curl -s --max-time 20 "$BASE/this-page-does-not-exist")
echo "$body" | grep -q "Este puente no llega" && pass "branded 404 page" || fail "404 page is not the site's"

echo "== Security headers"
for h in content-security-policy strict-transport-security x-content-type-options x-frame-options referrer-policy permissions-policy; do
  [ -n "$(header / "$h")" ] && pass "$h" || fail "missing $h"
done

echo "== Caching and compression"
asset=$(curl -s --max-time 20 "$BASE/" | grep -o '/_astro/[^"]*\.css' | head -1)
[ -n "$asset" ] && [[ "$(header "$asset" cache-control)" == *immutable* ]] && pass "immutable $asset" || fail "fingerprinted asset not immutable ($asset)"
[[ "$(header / cache-control)" == *no-cache* ]] && pass "HTML no-cache" || fail "HTML cache-control: $(header / cache-control)"
enc=$(curl -sI -H 'Accept-Encoding: gzip' --max-time 20 "$BASE$asset" | tr -d '\r' | grep -i '^content-encoding' | cut -d' ' -f2)
[ "$enc" = "gzip" ] && pass "gzip" || fail "content-encoding '$enc' (expected gzip)"

echo "== Content"
hub=$(curl -s --max-time 20 "$BASE/")
echo "$hub" | grep -q 'data-product="sign"' && pass "hub lists bb-sign" || fail "bb-sign card missing from the hub"
echo "$hub" | grep -q 'hreflang="en"' && pass "hreflang alternates" || fail "hreflang alternates missing"
sitemap=$(curl -s --max-time 20 "$BASE/sitemap-0.xml")
echo "$sitemap" | grep -q "/sign/legal/terms/" && pass "sitemap lists the terms" || fail "terms missing from sitemap"

echo
if [ "$FAILURES" -gt 0 ]; then
  echo "$FAILURES check(s) failed."
  exit 1
fi
echo "All checks passed."
