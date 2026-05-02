# HTTP API

The MVP only exposes one route — the seed/backfill endpoint. The endpoints
listed in CLAUDE.md §6.8 (`/api/runs`, `/api/runs/:id/stream`, etc.) are
roadmap items, not shipped.

## `GET|POST /api/seed`

Token-gated. Powers three operations through query params: seed, reset+seed,
or backfill demo costs.

### Auth

Compares `?token=<value>` against `process.env.SEED_TOKEN` with a constant-
time comparison. If `SEED_TOKEN` is unset on the server, the route returns
`503` — not a security risk, just a deliberately broken endpoint.

### Query params

| Param      | Values                | Effect                                                   |
| ---------- | --------------------- | -------------------------------------------------------- |
| `token`    | string                | Required. Must equal `SEED_TOKEN` env var.               |
| `reset`    | `true`                | Truncates `runs` and `results` before seeding.           |
| `backfill` | `cost`                | Skip seeding; recompute `cost_cents` on demo runs only.  |

`reset` and `backfill` are mutually exclusive — `backfill=cost` short-circuits
the rest.

### Behaviors

**Default (`?token=…`)** — runs the demo seed: 2 suites × 6 demo models, ~30
seconds. Additive — does not delete prior runs. Idempotent on `tests` rows
(deduped by content hash) but not on `runs` (every call inserts new rows).

**Reset (`?token=…&reset=true`)** — truncates runs/results first, then seeds.
Use after schema changes or to clean up stale model names.

**Backfill (`?token=…&backfill=cost`)** — runs a single SQL statement that
re-prices all `triggered_by IN ('seed','api-seed')` rows using a per-model
demo cost table with ±25% jitter. `triggered_by` filter ensures real eval
runs are never overwritten. Cheap (~300ms regardless of row count).

### Response shapes

```jsonc
// Default / reset
{
  "ok": true,
  "reset": false,
  "elapsedMs": 28412,
  "runs": [
    { "suite": "toy", "model": "anthropic:claude-opus-4-7", "runId": 1, "passed": 5, "total": 5 }
  ]
}

// Backfill
{
  "ok": true,
  "action": "backfill-cost",
  "elapsedMs": 312,
  "updated": 336
}

// Errors
{ "error": "invalid token", "code": "unauthorized" }            // 401
{ "error": "SEED_TOKEN env var is not set on the server", "code": "not_configured" }  // 503
{ "error": "...", "code": "seed_failed" }                       // 500
```

### Constraints

- Vercel function timeout is 60s. The default seed runs ~30s; future
  larger suites may need to be split.
- The mock provider's simulated latency is intentional — speeds it up
  would require a `?fast=true` flag.

### File

`app/api/seed/route.ts` — GET and POST share the same handler.
`maxDuration = 60` is exported.

## Roadmap (NOT shipped)

Per CLAUDE.md §6.8, the planned full API is:

```
GET   /api/suites
GET   /api/suites/:name
GET   /api/runs?suite=&model=&limit=&before=
GET   /api/runs/:id
GET   /api/runs/:id/results
GET   /api/runs/:id/stream             # SSE: progress events
POST  /api/runs                        # body: { suiteName, model, gitSha?, gitBranch? }
POST  /api/runs/:id/baseline           # toggle baseline
GET   /api/compare?a=:runId&b=:runId
POST  /api/webhooks/github
```

These come in later sprints — the dashboard currently bypasses HTTP and
talks to Drizzle directly from server components.
