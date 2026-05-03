# Database

Postgres on Neon, schema in `lib/db/schema.ts`, queried via Drizzle.
Migrations live in `drizzle/` — including the `meta/` directory, which
**must be committed** (drizzle-kit needs `_journal.json` at deploy time).

## Tables

### `suites`

| Column        | Type        | Notes                                          |
| ------------- | ----------- | ---------------------------------------------- |
| `id`          | bigserial   | PK                                             |
| `name`        | text unique | Surface name; used in URLs.                    |
| `description` | text        |                                                |
| `tags`        | text[]      | Default `[]`. Future filtering UI.             |
| `created_at`  | timestamptz | Default `now()`.                               |

### `tests`

One row per unique case content. Updates to a case's input/expected
create a new row (`content_hash` changes).

| Column        | Type        | Notes                                          |
| ------------- | ----------- | ---------------------------------------------- |
| `id`          | bigserial   | PK                                             |
| `suite_id`    | int FK      | → suites, ON DELETE CASCADE                    |
| `content_hash`| text        | `sha256(input + expected)`                     |
| `input`       | text        | Case input.                                    |
| `expected`    | text        | Reference, optional.                           |
| `metadata`    | jsonb       | Whatever the suite attached.                   |
| `tags`        | text[]      |                                                |
| Unique idx    |             | `(suite_id, content_hash)` — idempotent upsert |

### `runs`

One row per (suite × model × invocation).

| Column         | Type         | Notes                                              |
| -------------- | ------------ | -------------------------------------------------- |
| `id`           | bigserial    | PK                                                 |
| `suite_id`     | int FK       | → suites                                           |
| `model`        | text         | e.g. `anthropic:claude-haiku-4-5`                  |
| `prompt_hash`  | text         | `sha256(suiteName + renderedPrompt)`               |
| `prompt_text`  | text         | Snapshot of the prompt template                    |
| `status`       | text enum    | `running` \| `complete` \| `error`                 |
| `git_sha`      | text         | From env var `GIT_SHA` or runner option            |
| `git_branch`   | text         | Same                                               |
| `triggered_by` | text         | `cli` \| `gh-action` \| `seed` \| `api-seed`       |
| `started_at`   | timestamptz  | Default `now()`                                    |
| `finished_at`  | timestamptz  | Set when `status` flips to `complete` or `error`   |
| `notes`        | text         | Free-form                                          |
| `is_baseline`  | bool         | Default `false`. UI to flip this isn't shipped yet |
| Indexes        |              | `runs_suite_idx (suite_id)`, `runs_started_idx (started_at)` |

### `results`

One row per (run × case).

| Column          | Type        | Notes                                                |
| --------------- | ----------- | ---------------------------------------------------- |
| `id`            | bigserial   | PK                                                   |
| `run_id`        | int FK      | → runs, ON DELETE CASCADE                            |
| `test_id`       | int FK      | → tests                                              |
| `output`        | text        | Model response (`null` if errored)                   |
| `scores`        | jsonb       | `ScoreRecord[]` — one per scorer                     |
| `passed`        | bool        | `true` iff every score passed                        |
| `cost_cents`    | int         | Integer cents, default 0. See **Cost units** below   |
| `latency_ms`    | int         |                                                      |
| `input_tokens`  | int         |                                                      |
| `output_tokens` | int         |                                                      |
| `error_message` | text        | Set when the provider call threw                     |
| `source`        | text enum   | `app` \| `import`. Default `app`. See [imports.md](./imports.md). |
| `created_at`    | timestamptz | Default `now()`                                      |
| Unique idx      |             | `(run_id, test_id)`                                  |

`scores` is `ScoreRecord[]` (in `schema.ts`):

```ts
type ScoreRecord = {
  scorer: string
  value: number
  passed: boolean
  reason?: string
  judgeModel?: string
  judgeCostCents?: number
}
```

## Cost units

`cost_cents` is integer cents (1 = $0.01). Real evals at sub-cent per-row
prices currently round to the integer floor — see `lib/eval/cost-backfill.ts`
for the demo work-around. Sub-cent precision is on the roadmap (CLAUDE.md
hasn't formalized yet).

## Migrations

```bash
# After editing lib/db/schema.ts:
pnpm db:generate   # diff schema → new SQL file in drizzle/
pnpm db:migrate    # apply pending migrations to the configured DATABASE_URL
pnpm db:push       # alternative: skip migrations, push schema directly (dev only)
pnpm db:studio     # open drizzle-kit's local UI
```

**Never edit a shipped migration in `drizzle/`.** Add a new one. The
`drizzle/meta/_journal.json` file tracks which migrations have been
applied — keep it committed; the deploy build runs `db:migrate` from CI.

## Build-time migration

`scripts/maybe-migrate.mjs` runs `drizzle-kit migrate` only when
`DATABASE_URL` is set, otherwise prints a warning and exits 0. This lets
the first Vercel deploy succeed before Neon is attached. Wired as the
prefix of the `build` script in `package.json`.

## Querying

`lib/db/queries.ts` is the single home for server-side reads. Everything
the dashboard renders flows through one of:

- `listRuns({ limit, suiteName })`
- `getRun(id)` + `getRunResults(runId)`
- `getCompareData(aId, bId)`
- `getLeaderboard(suiteName)`
- `getSuiteTimeline(suiteName, limit)`
- `listSuites()`
- `getCostBreakdown()`

All return plain TS types (typed `select()` shapes). Server components
call them directly — no API layer in front.

## Connection

`lib/db/index.ts` exposes a lazy `getDb()` that builds a Neon HTTP-driver
client from `process.env.DATABASE_URL` on first call and caches it.

The HTTP driver is the right fit for Vercel serverless (no pooling
needed, instant cold starts). For local development with `db:studio`,
drizzle-kit uses its own connection.
