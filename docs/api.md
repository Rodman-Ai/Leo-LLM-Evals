# HTTP API

Public read API + webhook configuration. The interactive reference lives at
[`/api-docs`](#interactive-swagger-ui) — that's the source of truth for
schemas. This page documents the high-level surface and shared
conventions.

## Conventions

- All responses are `application/json`.
- Errors use the envelope `{ error: string, code: string, details?: unknown }`
  with appropriate HTTP status (4xx / 5xx).
- Reads (`GET`) are unauthenticated. Writes are unauthenticated too — the MVP
  is single-tenant per CLAUDE.md §6.17.
- Path params and query strings are validated via Zod. Unknown / out-of-range
  values return `400 invalid_request`.
- Server components in `/app` bypass HTTP and call `lib/db/queries.ts`
  directly. The HTTP API exists for external integrations.

## Read endpoints

| Method | Path                          | Returns                                                |
| ------ | ----------------------------- | ------------------------------------------------------ |
| GET    | `/api/suites`                 | `{ suites: SuiteSummary[] }`                           |
| GET    | `/api/runs`                   | `{ runs: RunSummary[] }` — `?suite=` `?limit=`         |
| GET    | `/api/runs/{id}`              | `{ run, results }`                                     |
| GET    | `/api/leaderboard/{name}`     | `{ suite, entries }`                                   |
| GET    | `/api/openapi.json`           | OpenAPI 3.1 document                                   |

## Webhook config endpoints

| Method | Path                                  | Effect                                              |
| ------ | ------------------------------------- | --------------------------------------------------- |
| GET    | `/api/webhooks`                       | Returns one row per supported event (`run.completed`, `regression.detected`); rows that have not been configured yet have `id=null`. |
| PUT    | `/api/webhooks/{event}`               | Body `{ url, enabled, secret? }`. URL must be `https://` or `null` to clear. Secret ≥8 chars when set. |
| POST   | `/api/webhooks/{event}/test`          | Fires a synthetic delivery using `lib/webhooks/fixtures.ts`. Returns the recorded delivery row. `force=true` is implied. |
| GET    | `/api/webhooks/{event}/deliveries`    | Last 20 attempts (`?limit=` up to 100).             |

## Operational

| Method | Path                  | Effect                                                                      |
| ------ | --------------------- | --------------------------------------------------------------------------- |
| GET    | `/api/seed`           | Token-gated demo seed / cost backfill. See [demo-mode.md](./demo-mode.md).  |
| POST   | `/api/seed`           | Same as `GET`; either method works.                                          |

## Interactive Swagger UI

Visit `/api-docs` on the deployed app for the full interactive reference,
including request bodies, response schemas, "Try it out" support, and the
documented webhook payloads. The page renders Swagger UI loaded from
`unpkg.com/swagger-ui-dist@5` against the live `/api/openapi.json`.

## Outgoing webhooks

See [webhooks.md](./webhooks.md) for the full delivery contract — payload
schemas, signing, retry policy, and the configuration UI at `/webhooks`.

## Roadmap (NOT shipped)

Per CLAUDE.md §6.8 + the Sprint 11 plan:

- `POST /api/runs` — trigger a run via API
- `GET /api/runs/{id}/stream` — SSE progress events
- `POST /api/runs/{id}/baseline` — toggle baseline flag
- `GET /api/compare?a=&b=` — programmatic three-way compare
- `POST /api/webhooks/github` — GitHub webhook receiver

The dashboard hits Drizzle directly today, so these are nice-to-have for
external integrations but not blockers.
