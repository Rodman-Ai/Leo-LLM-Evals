# Architecture

## Repo layout

```
app/                       Next.js App Router routes
  (dash)/                  ←  Dashboard pages, share a layout w/ nav
    page.tsx               ←  / — recent runs
    suites/                ←  /suites + /suites/[name]
    runs/                  ←  /runs + /runs/[id]
    compare/               ←  /compare?a=&b=
    leaderboard/[name]/    ←  /leaderboard/<suite> + opengraph-image.tsx
    costs/                 ←  /costs — spend dashboard
  embed/leaderboard/       ←  /embed/leaderboard/<suite> — chrome-less iframe
  api/seed/                ←  POST/GET token-gated seed endpoint
  layout.tsx               ←  Root layout — html/body wrapper only
  globals.css              ←  Tailwind + CSS vars
components/
  charts/                  ←  Recharts client components (PassRateBars, etc.)
  RunStatusBadge.tsx       ←  Shared dashboard pieces
  ModelTag.tsx
  ScoreBar.tsx
  CostCell.tsx
  EmbedSnippet.tsx
lib/
  eval/                    ←  The runner + scorers
    runner.ts              ←  runSuite() — orchestrates a single (suite, model) run
    suite.ts               ←  defineSuite() + Case / SuiteDef types
    scorer.ts              ←  Scorer types + exact / contains scorers
    judge.ts               ←  llmJudge scorer (structured output via Zod)
    provider.ts            ←  AI SDK wrappers + retry-with-backoff
    pricing.ts             ←  Per-model token pricing table
    mock.ts                ←  mock:* provider (deterministic synthetic outputs)
    cost-backfill.ts       ←  Re-prices demo rows
    demo-seed.ts           ←  Seeds the DB via mock provider
    index.ts               ←  Barrel export — public surface
  db/
    schema.ts              ←  Drizzle tables: suites, tests, runs, results
    queries.ts             ←  Server-side reads for the dashboard
    index.ts               ←  Lazy db client (Neon HTTP driver)
  format.ts                ←  Cost / latency / date formatters + pass-rate colors
scripts/
  eval.ts                  ←  CLI — `pnpm eval`
  seed.ts                  ←  CLI — `pnpm db:seed`
  maybe-migrate.mjs        ←  Build-time migration runner (skips if no DATABASE_URL)
  format-pr-comment.mjs    ←  GitHub Action — formats markdown PR comment
  quality-gate.mjs         ←  GitHub Action — exits non-zero on regression
tests/
  toy.eval.ts              ←  5-case smoke suite
  code-review.eval.ts      ←  53-case code-review classification suite
  _fixtures/               ←  Vitest unit tests (excluded from suite discovery)
drizzle/                   ←  Schema migrations (commit drizzle/meta!)
.github/workflows/eval.yml ←  PR action
```

## Data flow

```
 ┌──────────────────┐                                   ┌──────────────────┐
 │ tests/*.eval.ts  │   ─── load via dynamic import ──▶ │  CLI / API /     │
 │                  │                                   │  GH Action       │
 └──────────────────┘                                   └─────┬────────────┘
                                                              │ runSuite()
                                                              ▼
                                              ┌────────────────────────────────┐
                                              │  lib/eval/runner.ts            │
                                              │  ─ insert run row              │
                                              │  ─ for each case (p-limit 5):  │
                                              │      generate() via provider   │
                                              │      run scorers               │
                                              │      insert result row         │
                                              │  ─ finalize run                │
                                              └─────┬──────────────────────────┘
                                                    │
                                                    ▼
                                    ┌────────────────────────────────┐
                                    │  Neon Postgres                 │
                                    │  suites · tests · runs ·       │
                                    │  results                       │
                                    └─────┬──────────────────────────┘
                                          │ Drizzle queries
                                          ▼
                                    ┌────────────────────────────────┐
                                    │  Server Components in app/     │
                                    │  (dash)/ — fetch then render   │
                                    └────────────────────────────────┘
```

## Four key abstractions

| Concept     | Where              | One-liner                                                  |
| ----------- | ------------------ | ---------------------------------------------------------- |
| `Suite`     | `lib/eval/suite.ts`| Group of cases run against one or more models.             |
| `Case`      | same               | One input + optional expected + scorers.                   |
| `Scorer`    | `lib/eval/scorer.ts`| `(ctx) => { value, passed, reason? }`. Composable per case.|
| `Run`       | `lib/db/schema.ts` | One execution of (suite × model). Result rows hang off it. |

## Locked stack

Per [`CLAUDE.md`](../CLAUDE.md) §2 — these don't change without an explicit
update to that file:

Next.js 15 (App Router), TypeScript strict, Drizzle ORM, Neon Postgres,
Vercel AI SDK (`ai` + `@ai-sdk/*`), Tailwind, shadcn/ui, Recharts, Vitest,
pnpm. Hosting on Vercel.

## What this isn't

Per CLAUDE.md §1.2: not a tracing platform, not a workflow builder, not
red-team-first, not multi-tenant. The wedge is "code-defined eval +
comparison dashboard + GH Action native + free self-host" — features that
push us off that wedge belong in someone else's tool.
