#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# PulseFit deployment smoke test.
# Usage: bash scripts/verify.sh [base-url]     (default http://localhost:3000)
# ---------------------------------------------------------------------------
BASE="${1:-http://localhost:3000}"
PASS=0
FAIL=0

green() { printf "\033[32m%s\033[0m" "$1"; }
red()   { printf "\033[31m%s\033[0m" "$1"; }

# check <label> <expected-code> <curl args...>
check() {
  local label="$1"; local expected="$2"; shift 2
  local code
  code=$(curl -s -o /tmp/vbody -w "%{http_code}" --max-time 15 "$@")
  if [ "$code" = "$expected" ]; then
    PASS=$((PASS+1)); printf "  %s %-46s %s\n" "$(green '✓')" "$label" "$code"
  else
    FAIL=$((FAIL+1)); printf "  %s %-46s got %s want %s\n" "$(red '✗')" "$label" "$code" "$expected"
    head -c 180 /tmp/vbody; echo
  fi
}

# contains <label> <substring> <curl args...>
contains() {
  local label="$1"; local needle="$2"; shift 2
  local body
  body=$(curl -s --max-time 15 "$@")
  if printf '%s' "$body" | grep -q "$needle"; then
    PASS=$((PASS+1)); printf "  %s %-46s\n" "$(green '✓')" "$label"
  else
    FAIL=$((FAIL+1)); printf "  %s %-46s missing '%s'\n" "$(red '✗')" "$label" "$needle"
    printf '%s' "$body" | head -c 180; echo
  fi
}

echo "=============================================================="
echo " PulseFit verification against $BASE"
echo "=============================================================="

echo
echo "[1] Operational probes"
check "GET  /api/health              (liveness)"   200 "$BASE/api/health"
check "GET  /api/ready               (readiness)"  200 "$BASE/api/ready"
check "GET  /api/version             (build info)" 200 "$BASE/api/version"
contains "readiness reports migrations ok" '"migrations":{"ok":true}' "$BASE/api/ready"

echo
echo "[2] Web pages (server-rendered)"
for page in "/:dashboard" "/workouts:workouts" "/nutrition:nutrition" "/progress:progress" "/settings:goals" "/docs:api docs"; do
  path="${page%%:*}"; name="${page##*:}"
  check "GET  ${path:-/}  ($name)" 200 "$BASE$path"
done
contains "dashboard renders activity rings" "Today" "$BASE/"
contains "docs page lists API endpoints"    "PulseFit API" "$BASE/docs"

echo
echo "[3] API discovery & contract"
check "GET  /api/v1                  (discovery)"  200 "$BASE/api/v1"
check "GET  /api/v1/openapi.json     (spec)"       200 "$BASE/api/v1/openapi.json"
contains "OpenAPI 3.0.3 document"  '"openapi":"3.0.3"' "$BASE/api/v1/openapi.json"

echo
echo "[4] Authentication"
LOGIN=$(curl -s --max-time 15 -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@pulsefit.app","password":"pulsefit123","deviceName":"verify"}')
TOKEN=$(printf '%s' "$LOGIN" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
if [ -n "$TOKEN" ]; then
  PASS=$((PASS+1)); printf "  %s %-46s %s...\n" "$(green '✓')" "POST /api/v1/auth/login" "${TOKEN:0:14}"
else
  FAIL=$((FAIL+1)); printf "  %s %-46s\n" "$(red '✗')" "POST /api/v1/auth/login"; echo "$LOGIN"
fi
AUTH="Authorization: Bearer $TOKEN"
check "GET  /api/v1/auth/me          (session)"    200 "$BASE/api/v1/auth/me" -H "$AUTH"
check "GET  /api/v1/profile"                       200 "$BASE/api/v1/profile" -H "$AUTH"
check "GET  /api/v1/goals"                         200 "$BASE/api/v1/goals"   -H "$AUTH"
check "bad token rejected"                         401 "$BASE/api/v1/profile" -H "Authorization: Bearer pf_invalid"
check "wrong password rejected"                    401 -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' -d '{"email":"demo@pulsefit.app","password":"wrong"}'

echo
echo "[5] Reads"
check "GET  /api/v1/workouts"                      200 "$BASE/api/v1/workouts?limit=5" -H "$AUTH"
check "GET  /api/v1/meals"                         200 "$BASE/api/v1/meals?limit=5"    -H "$AUTH"
check "GET  /api/v1/logs?days=7"                   200 "$BASE/api/v1/logs?days=7"      -H "$AUTH"
check "GET  /api/v1/exercises?q=squat"             200 "$BASE/api/v1/exercises?q=squat" -H "$AUTH"
check "GET  /api/v1/stats/summary"                 200 "$BASE/api/v1/stats/summary"    -H "$AUTH"
check "GET  /api/v1/stats/trends?days=30"          200 "$BASE/api/v1/stats/trends?days=30" -H "$AUTH"
check "GET  /api/v1/insights"                      200 "$BASE/api/v1/insights"         -H "$AUTH"
contains "workout list returns pagination meta" '"hasMore"' "$BASE/api/v1/workouts?limit=2" -H "$AUTH"

echo
echo "[6] Write lifecycle (create -> read -> patch -> delete)"
WID=$(curl -s --max-time 15 -X POST "$BASE/api/v1/workouts" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"title":"Verify Session","category":"hiit","durationMin":24,"calories":280,"intensity":"high"}' \
  | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
[ -n "$WID" ] && { PASS=$((PASS+1)); printf "  %s %-46s id=%s\n" "$(green '✓')" "POST create workout" "$WID"; } \
             || { FAIL=$((FAIL+1)); printf "  %s %-46s\n" "$(red '✗')" "POST create workout"; }
check "GET    workout by id"                       200 "$BASE/api/v1/workouts/$WID" -H "$AUTH"
contains "PATCH preserves untouched fields" '"intensity":"high"' -X PATCH "$BASE/api/v1/workouts/$WID" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"calories":300}'
check "DELETE workout"                             204 -X DELETE "$BASE/api/v1/workouts/$WID" -H "$AUTH"
check "GET    deleted workout is 404"              404 "$BASE/api/v1/workouts/$WID" -H "$AUTH"

MID=$(curl -s --max-time 15 -X POST "$BASE/api/v1/meals" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"Verify Meal","mealType":"snack","protein":30,"carbs":40,"fat":10}' \
  | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
contains "meal calories derived from macros" '"calories":370' "$BASE/api/v1/meals/$MID" -H "$AUTH"
check "DELETE meal"                                204 -X DELETE "$BASE/api/v1/meals/$MID" -H "$AUTH"

echo
echo "[7] Daily logs & hydration"
contains "POST /api/v1/logs upserts a day" '"steps":9100' -X POST "$BASE/api/v1/logs" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"steps":9100,"sleepHours":7.2}'
contains "POST /api/v1/logs/water increments" '"waterMl"' -X POST "$BASE/api/v1/logs/water" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"amountMl":250}'
contains "POST /api/v1/logs/water decrements" '"waterMl"' -X POST "$BASE/api/v1/logs/water" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"amountMl":-250}'

echo
echo "[8] Validation & error handling"
check "empty title rejected (422)"                 422 -X POST "$BASE/api/v1/workouts" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"title":"","durationMin":30}'
check "out-of-range duration rejected (422)"       422 -X POST "$BASE/api/v1/workouts" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"title":"x","durationMin":99999}'
check "malformed JSON rejected (400)"              400 -X POST "$BASE/api/v1/workouts" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{not json'
check "wrong content-type rejected (400)"          400 -X POST "$BASE/api/v1/workouts" \
  -H "$AUTH" -H 'Content-Type: text/plain' -d 'hello'
check "non-numeric id rejected (400)"              400 "$BASE/api/v1/workouts/abc" -H "$AUTH"
check "unknown route is 404"                       404 "$BASE/api/v1/does-not-exist"
contains "errors carry a requestId" '"requestId"' "$BASE/api/v1/workouts/999999" -H "$AUTH"

echo
echo "[9] Multi-tenancy & scopes"
STAMP=$(date +%s)
REG=$(curl -s --max-time 15 -X POST "$BASE/api/v1/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"verify$STAMP@example.com\",\"password\":\"strongpass123\",\"name\":\"Verify User\"}")
NTOKEN=$(printf '%s' "$REG" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
[ -n "$NTOKEN" ] && { PASS=$((PASS+1)); printf "  %s %-46s\n" "$(green '✓')" "POST register new account"; } \
                 || { FAIL=$((FAIL+1)); printf "  %s %-46s\n" "$(red '✗')" "POST register new account"; }
check "duplicate email rejected (409)"             409 -X POST "$BASE/api/v1/auth/register" \
  -H 'Content-Type: application/json' -d "{\"email\":\"verify$STAMP@example.com\",\"password\":\"strongpass123\",\"name\":\"Dup\"}"
contains "new tenant sees zero workouts" '"total":0' "$BASE/api/v1/workouts" -H "Authorization: Bearer $NTOKEN"

ROTOKEN=$(curl -s --max-time 15 -X POST "$BASE/api/v1/auth/tokens" -H "Authorization: Bearer $NTOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"readonly","scopes":["read"]}' \
  | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
check "read-only token can read"                   200 "$BASE/api/v1/goals" -H "Authorization: Bearer $ROTOKEN"
check "read-only token blocked on write (403)"     403 -X POST "$BASE/api/v1/workouts" \
  -H "Authorization: Bearer $ROTOKEN" -H 'Content-Type: application/json' -d '{"title":"nope","durationMin":10}'
check "logout revokes token (204)"                 204 -X DELETE "$BASE/api/v1/auth/me" -H "Authorization: Bearer $NTOKEN"
check "revoked token rejected (401)"               401 "$BASE/api/v1/auth/me" -H "Authorization: Bearer $NTOKEN"

echo
echo "[10] Headers, CORS & rate limiting"
HDRS=$(curl -s -D - -o /dev/null --max-time 15 "$BASE/api/v1/exercises" -H "$AUTH")
for h in "x-request-id" "x-api-version" "x-ratelimit-limit" "x-ratelimit-remaining"; do
  if printf '%s' "$HDRS" | grep -qi "$h"; then
    PASS=$((PASS+1)); printf "  %s %-46s\n" "$(green '✓')" "response header $h"
  else
    FAIL=$((FAIL+1)); printf "  %s %-46s\n" "$(red '✗')" "response header $h"
  fi
done
PRE=$(curl -s -D - -o /dev/null --max-time 15 -X OPTIONS "$BASE/api/v1/workouts" \
  -H "Origin: https://app.example.com" -H "Access-Control-Request-Method: POST")
printf '%s' "$PRE" | grep -qi "access-control-allow-origin: https://app.example.com" \
  && { PASS=$((PASS+1)); printf "  %s %-46s\n" "$(green '✓')" "CORS preflight echoes origin"; } \
  || { FAIL=$((FAIL+1)); printf "  %s %-46s\n" "$(red '✗')" "CORS preflight echoes origin"; }

RL_HIT=0
for i in $(seq 1 16); do
  c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST "$BASE/api/v1/auth/login" \
    -H 'Content-Type: application/json' -d '{"email":"rl@example.com","password":"bad"}')
  [ "$c" = "429" ] && RL_HIT=1 && break
done
[ "$RL_HIT" = "1" ] && { PASS=$((PASS+1)); printf "  %s %-46s\n" "$(green '✓')" "auth endpoint rate limits (429)"; } \
                    || { FAIL=$((FAIL+1)); printf "  %s %-46s\n" "$(red '✗')" "auth endpoint rate limits (429)"; }

echo
echo "[11] Legacy UI endpoints (used by the web dashboard)"
check "GET  /api/workouts"                         200 "$BASE/api/workouts"
check "GET  /api/meals"                            200 "$BASE/api/meals"
check "GET  /api/logs"                             200 "$BASE/api/logs"
check "GET  /api/settings"                         200 "$BASE/api/settings"

echo
echo "=============================================================="
printf " Result: %s passed, %s failed\n" "$(green $PASS)" "$([ $FAIL -eq 0 ] && green 0 || red $FAIL)"
echo "=============================================================="
[ "$FAIL" -eq 0 ] || exit 1
