# PulseFit — Fitness & Health Tracker

A full-stack fitness application: a Next.js (App Router) web dashboard **plus a deployable REST
backend** for mobile/third-party clients, backed by PostgreSQL via Drizzle ORM.

- Web app: `/`, `/workouts`, `/nutrition`, `/progress`, `/settings`
- API docs (live): `/docs`
- OpenAPI 3.0 spec: `/api/v1/openapi.json`
- Service discovery: `/api/v1`

---

## 1. Backend overview

| Concern | Implementation |
| --- | --- |
| Transport | REST over JSON, versioned under `/api/v1` |
| Envelope | Success `{ ok, data, meta? }` · Error `{ ok:false, error:{code,message,details?}, requestId }` |
| Auth | Bearer tokens (`Authorization: Bearer pf_…` or `X-Api-Key`), scrypt password hashing, SHA-256 token digests at rest |
| Scopes | `read`, `write`, `admin` — enforced per endpoint |
| Validation | Zod schemas for every body and query string (`422` with per-field details) |
| Rate limiting | Sliding window per endpoint + caller, `X-RateLimit-*` and `Retry-After` headers |
| CORS | Configurable allow-list, automatic preflight on every route |
| Observability | Structured JSON request logs, `X-Request-Id` correlation, `/api/health`, `/api/ready`, `/api/version` |
| Pagination | `limit`/`offset` with `total`, `hasMore`, `nextOffset` in `meta` |

### Endpoint map

```
GET    /api/v1                        service discovery
GET    /api/v1/openapi.json           OpenAPI 3.0 document

POST   /api/v1/auth/register          create account -> token
POST   /api/v1/auth/login             credentials -> token
GET    /api/v1/auth/me                session, profile, goals
DELETE /api/v1/auth/me                logout (revoke current token)
GET    /api/v1/auth/tokens            list API tokens
POST   /api/v1/auth/tokens            issue a scoped token
DELETE /api/v1/auth/tokens/{id}       revoke a token

GET    /api/v1/profile                PATCH to update
GET    /api/v1/goals                  PATCH to update

GET    /api/v1/workouts               filters: from,to,category,intensity,q,sort,order,limit,offset
POST   /api/v1/workouts
GET    /api/v1/workouts/{id}          PATCH / DELETE

GET    /api/v1/meals                  filters: from,to,mealType,q,limit,offset
POST   /api/v1/meals                  calories derived from macros when omitted
GET    /api/v1/meals/{id}             PATCH / DELETE

GET    /api/v1/logs                   range of daily biometrics
POST   /api/v1/logs                   upsert a day
GET    /api/v1/logs/{date}            PATCH a single day
POST   /api/v1/logs/water             atomic hydration increment

GET    /api/v1/exercises              searchable movement library
GET    /api/v1/stats/summary?date=    activity rings + energy balance
GET    /api/v1/stats/trends?days=30   time series, averages, weight delta
GET    /api/v1/insights               rule-based coaching tips

GET    /api/health                    liveness
GET    /api/ready                     readiness (DB + migrations)
GET    /api/version                   build metadata
```

### Quick start

```bash
# Demo account is seeded on first request
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@pulsefit.app","password":"pulsefit123"}'

TOKEN=pf_...   # accessToken from the response above

curl http://localhost:3000/api/v1/stats/summary -H "Authorization: Bearer $TOKEN"

curl -X POST http://localhost:3000/api/v1/workouts \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Tempo Run","category":"cardio","durationMin":32,"calories":390,"distanceKm":6.5}'
```

> `DEMO_MODE=true` lets unauthenticated calls fall back to the seeded demo account so the API is
> explorable immediately after deploy. **Set `DEMO_MODE=false` in production.**

---

## 2. Local development

```bash
npm install
cp .env.example .env          # point DATABASE_URL at your Postgres
node scripts/migrate.mjs      # idempotent schema migration
npm run dev                   # http://localhost:3000
```

Drizzle Kit is available for schema iteration during development:

```bash
npx drizzle-kit push
```

---

## 3. Deployment

### Option A — Docker Compose (API + Postgres)

```bash
docker compose up --build -d
docker compose logs -f api
curl http://localhost:3000/api/ready
```

### Option B — Docker image on any host / PaaS

```bash
docker build -t pulsefit-api .
docker run -d -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/pulsefit" \
  -e DEMO_MODE=false \
  -e CORS_ALLOWED_ORIGINS="https://app.example.com" \
  -e APP_VERSION="$(git describe --tags --always)" \
  --name pulsefit pulsefit-api
```

The image is a multi-stage build producing a Next.js **standalone** bundle running as a non-root
user. On boot the container runs `scripts/migrate.mjs` (idempotent DDL) and then `server.js`, so a
fresh database is provisioned automatically. A `HEALTHCHECK` polls `/api/health`.

### Option C — Vercel / Netlify / Render / Fly.io

1. Provision a managed Postgres (Neon, Supabase, RDS…) and copy its connection string.
2. Set the environment variables from `.env.example` (`DATABASE_URL`, `DEMO_MODE=false`,
   `CORS_ALLOWED_ORIGINS`, `AUTH_TOKEN_TTL_DAYS`, …). Add `DATABASE_SSL=true` if the provider
   requires TLS.
3. Run `node scripts/migrate.mjs` once as a release/predeploy command.
4. Deploy — the platform builds with `npm run build` and serves the App Router runtime.

### Health probes for orchestrators

| Probe | Path | Semantics |
| --- | --- | --- |
| Liveness | `/api/health` | process is up and can reach Postgres |
| Readiness | `/api/ready` | Postgres reachable **and** all 8 tables present (`503` otherwise) |
| Info | `/api/version` | version, commit, environment, uptime |

### Scaling notes

- Rate limiting is in-memory: it is per-instance. Swap `src/server/rate-limit.ts` for a Redis-backed
  store when running more than one replica behind a load balancer.
- The Postgres pool is reused across hot reloads via a global singleton (`src/db/index.ts`).
- All API routes are `force-dynamic` + `Cache-Control: no-store`; the OpenAPI document is cached for
  5 minutes.

---

## 4. Project layout

```
src/
  app/
    api/health|ready|version/       ops probes
    api/v1/**                       versioned REST API
    (dashboard pages)               web UI
    docs/                           rendered API reference
  components/                       UI + charts (dependency-free SVG)
  db/                               drizzle schema, client, seed data
  lib/                              date helpers, aggregations, insights engine
  server/
    auth.ts       tokens, scrypt hashing, scope checks
    config.ts     env-driven runtime config
    errors.ts     ApiError + status mapping
    handler.ts    route wrapper: CORS, rate limit, auth, logging, errors
    http.ts       envelopes, parsing, pagination
    openapi.ts    OpenAPI 3.0 document
    repo.ts       query layer (filters, aggregates, upserts)
    schemas.ts    Zod request contracts
    serialize.ts  DB row -> API DTO
    stats.ts      summaries, trends, insights
scripts/migrate.mjs                 idempotent SQL migration runner
Dockerfile · docker-compose.yml · .env.example
```

---

## 5. Security checklist before going live

- [ ] `DEMO_MODE=false`
- [ ] Restrict `CORS_ALLOWED_ORIGINS` to your app domains
- [ ] Serve behind TLS (tokens are bearer credentials)
- [ ] Rotate `DEMO_PASSWORD` or delete the demo user
- [ ] Lower `AUTH_TOKEN_TTL_DAYS` for sensitive deployments
- [ ] Put a WAF/CDN in front for global rate limiting across replicas

_This project is a demo and does not provide medical advice._
