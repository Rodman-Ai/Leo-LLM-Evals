# CLAUDE.md

> **Read this file at the start of every session.** It is the single source of truth for what this project is, how it's built, and where it's going. Update it when decisions change.

---

## 1. Project: `evalbench`

An open-source LLM evaluation dashboard. Define test cases in code, run them across multiple models, score with deterministic + LLM-as-judge methods, and track regressions over time. Designed to feel like `pytest` for prompts, with a dashboard on top.

**Repo:** `<your-username>/evalbench`
**Live demo:** Deployed on Vercel at `https://evalbench.vercel.app`

### 1.1 Why this exists

Hiring managers who have shipped LLMs in production know evals are the unsexy bottleneck. Existing tools are either:
- Heavyweight SaaS (Braintrust, LangSmith) — gated, expensive at scale
- Open-source but unopinionated (Langfuse, Phoenix) — observability-first, eval depth is secondary
- Local-only CLIs (Promptfoo, DeepEval) — no shared dashboard or persistent history

`evalbench` is the small, opinionated middle: code-defined tests, real comparison UI, GitHub-Action-native, free to self-host on Vercel + Neon. Goal is portfolio quality, not enterprise features.

### 1.2 Non-goals

- We are **not** a tracing / observability platform (no OTel ingestion, no production span search).
- We are **not** a red-teaming framework (Promptfoo owns that).
- We are **not** a workflow builder (no visual canvas).
- No multi-tenancy, no RBAC, no SSO. Single-workspace by design.

---

## 2. Stack (locked unless flagged)

| Layer            | Choice                                              |
| ---------------- | --------------------------------------------------- |
| Framework        | Next.js 15 (App Router) + TypeScript (strict)       |
| Hosting          | Vercel                                              |
| Database         | Neon Postgres (serverless), via Vercel integration  |
| ORM              | Drizzle                                             |
| LLM client       | Vercel AI SDK (`ai` + provider packages)            |
| UI               | Tailwind + shadcn/ui                                |
| Charts           | Recharts                                            |
| Tables           | TanStack Table                                      |
| CI               | GitHub Actions                                      |
| Lint/format      | ESLint + Prettier (tabs, single quotes, no semis)   |
| Tests            | Vitest                                              |
| Package manager  | pnpm                                                |

Rules: do not introduce new top-level dependencies without updating this table and noting *why*.

---

## 3. Architecture

```
┌──────────────────────┐       ┌─────────────────────┐
│  /tests/*.eval.ts    │──────▶│  Eval Runner        │
│  (Git-tracked)       │       │  (CLI / API route / │
│                      │       │   GH Action)        │
└──────────────────────┘       └─────────┬───────────┘
                                         │
                          parallel calls │ (Vercel AI SDK)
                                         ▼
                          ┌──────────────────────────┐
                          │  Provider APIs           │
                          │  (OpenAI, Anthropic,     │
                          │   Google, Ollama, etc.)  │
                          └─────────┬────────────────┘
                                    │
                                    ▼
                          ┌──────────────────────────┐
                          │  Scorers                 │
                          │  (deterministic +        │
                          │   LLM-as-judge)          │
                          └─────────┬────────────────┘
                                    │
                                    ▼
                          ┌──────────────────────────┐
                          │  Neon Postgres           │
                          │  (suites, tests, runs,   │
                          │   results)               │
                          └─────────┬────────────────┘
                                    │
                                    ▼
                          ┌──────────────────────────┐
                          │  Next.js Dashboard       │
                          │  (RSC + SSE streaming)   │
                          └──────────────────────────┘
```

### 3.1 Data model (high level)

- `suites` — a logical grouping of tests (e.g. "contract-review")
- `tests` — individual cases: input, expected, scoring config, tags
- `runs` — one execution of a suite against a model + prompt version
- `results` — one row per (test × run): output, score, cost, latency, tokens
- `baselines` — pinned runs used as the comparison reference

(Full schema in §6.3.)

---

## 4. Conventions

- **TypeScript strict, no `any`.** Use `unknown` and narrow.
- **Server Components by default.** Drop to client only for interactivity.
- **No client-side secrets.** All provider keys are server-side env vars.
- **Drizzle migrations** in `/drizzle`. Never edit a shipped migration; add a new one.
- **Cost is a first-class column.** Every result row stores cents-as-integer cost. Never compute on the fly.
- **Determinism where possible.** Pin provider versions. Default `temperature: 0` for judges.
- **Errors are data.** A failed test run is a row with status `error`, not a thrown exception that loses the trace.
- **Streaming UI.** Long-running runs stream progress over SSE; never block on a full run.
- **Imports use `@/` alias.** No deep relative paths.

### 4.1 File layout

```
/app
  /(dash)              # dashboard routes (server components)
  /api
    /runs              # POST start, GET stream
    /webhooks/github
/components
  /ui                  # shadcn primitives
  /charts
/lib
  /eval                # runner, scorer interface, providers, pricing
  /db                  # drizzle schema + queries
/scripts               # one-off scripts (PR comment formatter, dataset loaders)
/tests                 # *.eval.ts files (Git-tracked test suites)
  /_fixtures           # synthetic data used by unit tests
/drizzle               # migrations
/.github/workflows     # eval CI
```

---

## 5. Commands

```bash
pnpm dev               # local dev server
pnpm db:generate       # generate migration from schema diff
pnpm db:push           # apply schema to local Neon branch
pnpm db:studio         # Drizzle Studio
pnpm eval              # run all suites locally, write to DB
pnpm eval --suite=foo  # run one suite
pnpm eval --baseline   # mark this run as the new baseline
pnpm test              # vitest unit tests
pnpm typecheck
pnpm lint
pnpm format
```

---

## 6. MVP — full specification

The MVP is the smallest version that's still demonstrably useful and visibly polished. Three focused weekends, ~20–25 hours total. Everything in this section is in scope. Anything not in this section is post-MVP and lives in §7.

### 6.1 Scope at a glance

**In scope:**
- TypeScript test files (`*.eval.ts`) with three scorer types: `exact`, `contains`, `llmJudge`
- Three providers via Vercel AI SDK: OpenAI, Anthropic, Google
- CLI runner (`pnpm eval`) and serverless runner (`POST /api/runs`)
- Dashboard pages: home, suites, runs, run detail, compare, leaderboard
- GitHub Action with PR comment + quality gate
- Public deployed demo with one real 50-case suite

**Out of scope (deferred to roadmap):**
- Production trace ingestion / OTel
- Prompt registry / versioning UI (prompts inline in test files for MVP)
- Human annotation
- Multi-tenancy / auth
- YAML test format
- RAG-specific scorers
- Red-team / safety scorers

### 6.2 Phase plan

#### Weekend 1 — End-to-end ugly
- [ ] Next.js scaffold, Tailwind + shadcn, Drizzle + Neon connected
- [ ] Schema and first migration applied
- [ ] One provider (OpenAI), one scorer (`exact`)
- [ ] CLI: `pnpm eval` reads `*.eval.ts`, runs them, writes results
- [ ] Dashboard route: list of runs, click → table of results
- [ ] Deploy to Vercel with one toy suite (5 cases)

#### Weekend 2 — Multi-provider + judges
- [ ] Anthropic + Google providers via Vercel AI SDK
- [ ] `llmJudge` scorer with structured output (Zod schema)
- [ ] Cost / latency / token capture per result
- [ ] Run comparison view (two runs side-by-side, deltas highlighted)
- [ ] Real suite of 50 cases (pick a domain — see §6.18)
- [ ] Public leaderboard page

#### Weekend 3 — CI loop + polish
- [ ] GitHub Action that runs evals on PR
- [ ] PR comment bot with score delta table
- [ ] Quality gate: configurable threshold blocks merge
- [ ] Cost dashboard (per-run, per-model, per-suite)
- [ ] README with architecture diagram + 90-second Loom
- [ ] Blog post: "I evaluated GPT-5, Claude Opus 4.7, and Gemini 2.5 on N cases"

### 6.3 Database schema (Drizzle)

`bigserial` PKs, `text` for content, `timestamp with timezone`, cost stored as integer cents.

```ts
// lib/db/schema.ts
import {
  pgTable, bigserial, integer, text, jsonb, timestamp, boolean,
  index, uniqueIndex,
} from 'drizzle-orm/pg-core'

export const suites = pgTable('suites', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  tags: text('tags').array().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tests = pgTable('tests', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  suiteId: integer('suite_id').notNull().references(() => suites.id, { onDelete: 'cascade' }),
  contentHash: text('content_hash').notNull(),  // sha256(input + expected)
  input: text('input').notNull(),
  expected: text('expected'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  tags: text('tags').array().notNull().default([]),
}, (t) => ({
  hashIdx: uniqueIndex('tests_suite_hash_idx').on(t.suiteId, t.contentHash),
}))

export const runs = pgTable('runs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  suiteId: integer('suite_id').notNull().references(() => suites.id),
  model: text('model').notNull(),                // 'anthropic:claude-opus-4-7'
  promptHash: text('prompt_hash').notNull(),
  promptText: text('prompt_text').notNull(),
  status: text('status', { enum: ['running', 'complete', 'error'] }).notNull(),
  gitSha: text('git_sha'),
  gitBranch: text('git_branch'),
  triggeredBy: text('triggered_by'),             // 'cli' | 'gh-action' | 'manual'
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  notes: text('notes'),
  isBaseline: boolean('is_baseline').notNull().default(false),
}, (t) => ({
  suiteIdx: index('runs_suite_idx').on(t.suiteId),
  startedIdx: index('runs_started_idx').on(t.startedAt),
}))

type ScoreRecord = {
  scorer: string
  value: number          // 0..1
  passed: boolean
  reason?: string
  judgeModel?: string
  judgeCostCents?: number
}

export const results = pgTable('results', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  runId: integer('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  testId: integer('test_id').notNull().references(() => tests.id),
  output: text('output'),
  scores: jsonb('scores').$type<ScoreRecord[]>().notNull().default([]),
  passed: boolean('passed').notNull(),
  costCents: integer('cost_cents').notNull().default(0),
  latencyMs: integer('latency_ms').notNull().default(0),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  runTestIdx: uniqueIndex('results_run_test_idx').on(t.runId, t.testId),
}))
```

Migrations generated via `pnpm db:generate` into `/drizzle`. Never edit shipped migrations — always add a new one.

### 6.4 Eval runner architecture

Single TypeScript module in `lib/eval/runner.ts`. Three entrypoints (CLI, API route, GH Action) all call the same `runSuite()`.

**Concurrency:**
- Default 5 cases in flight per suite (override via `concurrency: N` on `defineSuite`)
- `p-limit` enforces the gate
- Per-provider 429s handled via exponential backoff (3 retries: 1s, 4s, 16s)

**Lifecycle of a run:**
1. Resolve suite from registry (file glob `tests/**/*.eval.ts`)
2. Upsert `tests` rows (idempotent via `contentHash`)
3. Insert `runs` row with status `'running'`, return `runId`
4. For each case in parallel (gated by concurrency):
   1. Render prompt with case input
   2. Call provider via AI SDK; capture output, tokens, latency
   3. Run each scorer against output
   4. Compute aggregate `passed = scores.every(s => s.passed)`
   5. Insert `results` row
   6. Emit SSE event with progress
5. Update `runs` row: `status='complete'`, `finishedAt=now()`

**Failure handling:**
- Provider error → result row with `errorMessage`, `passed=false`. Other cases continue.
- Scorer error → score record with `value=0, passed=false, reason='scorer error: ...'`. Other scorers continue.
- DB error → fail the whole run, bubble up with non-zero exit.

### 6.5 Scorer interface

```ts
// lib/eval/scorer.ts
export type ScoreContext = {
  input: string
  expected?: string
  output: string
  metadata: Record<string, unknown>
}

export type Score = {
  value: number       // 0..1, 1 is perfect
  passed: boolean     // derived from value + threshold
  reason?: string     // human-readable
  costCents?: number  // for LLM judges
}

export type Scorer = {
  name: string
  score(ctx: ScoreContext): Promise<Score>
}
```

**Built-in scorers (MVP):**

```ts
exact({ ignoreCase?: boolean, trim?: boolean }): Scorer
contains({ substring: string, ignoreCase?: boolean }): Scorer
llmJudge({
  rubric: string,
  model: string,
  threshold?: number,    // default 0.7
}): Scorer
```

`llmJudge` returns structured output via Zod:
```ts
const JudgeSchema = z.object({
  score: z.number().min(0).max(1),
  reasoning: z.string().min(1),
})
```
With `temperature: 0` for stability.

### 6.6 Test file specification

Discovered from `tests/**/*.eval.ts`. Each file default-exports one `Suite`.

```ts
import { defineSuite, exact, llmJudge } from '@/eval'

export default defineSuite({
  name: 'summarization',           // unique within the project
  description: 'short-form news summaries',
  tags: ['english', 'news'],
  models: [                        // run against each
    'openai:gpt-5',
    'anthropic:claude-opus-4-7',
    'google:gemini-2.5-pro',
  ],
  prompt: ({ input }) => `Summarize this in one sentence:\n\n${input}`,
  concurrency: 5,
  cases: [
    {
      input: '...',
      expected: '...',
      tags: ['easy'],
      scorers: [exact({ ignoreCase: true })],
    },
    {
      input: '...',
      scorers: [llmJudge({
        rubric: 'Does this preserve the core action and subjects?',
        model: 'anthropic:claude-haiku-4-5',
        threshold: 0.7,
      })],
    },
  ],
})
```

Running a suite against N models produces N runs (one per model). The leaderboard groups runs by `(suite, model)`.

### 6.7 CLI specification

```bash
pnpm eval                          # all suites × all models
pnpm eval --suite=summarization    # one suite, all models
pnpm eval --model=openai:gpt-5     # all suites, one model
pnpm eval --suite=foo --model=bar  # one suite, one model
pnpm eval --baseline               # mark resulting runs as baseline
pnpm eval --watch                  # re-run on file change
pnpm eval --json                   # machine-readable output (for CI)
pnpm eval --no-db                  # dry run, no persist
```

**Exit codes:**
- `0` — all runs complete, all gates passed
- `1` — completed with failures or gate violations
- `2` — invocation error (bad suite name, missing env, etc.)

**Default output:** colored summary table per run + final aggregate. `--json` switches to NDJSON for the GitHub Action to parse.

### 6.8 API routes

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

JSON throughout. Errors as `{ error: string, code: string, details?: unknown }` with appropriate HTTP status.

**SSE event format:**
```
event: progress
data: {"runId":123,"caseIndex":4,"total":50,"passed":true}

event: done
data: {"runId":123,"summary":{"total":50,"passed":47,"costCents":42}}
```

### 6.9 Pages & UI surface

```
/                              Home — featured leaderboard + recent runs
/suites                        List of suites with last-run summaries
/suites/[name]                 Suite detail — runs over time + recent runs table
/runs                          All runs, filterable
/runs/[id]                     Run detail — header + results table
/compare?a=&b=                 Two-run side-by-side, row-aligned by test
/leaderboard/[suiteName]       Public model leaderboard for one suite
/about                         How it works (also serves as marketing)
```

**Visual conventions:**
- Pass rate as colored bar (green ≥ 0.85, yellow 0.70–0.85, red < 0.70)
- Cost in USD with 4 decimal places (e.g. `$0.0042`)
- Latency in ms, switching to seconds above 1000ms
- Diff view: green for improvements, red for regressions, gray for unchanged

### 6.10 Components inventory

shadcn primitives: Button, Card, Table, Badge, Tabs, Sheet, Dialog, Select, Input, Tooltip, Toast, ScrollArea.

Custom components in `components/`:
- `RunStatusBadge` — colored pill for running / complete / error
- `ScoreBar` — horizontal bar chart for score 0–1
- `CostCell` — formatted cost with breakdown tooltip (model + judge)
- `ModelTag` — provider-prefixed model name with provider color
- `RunCompareTable` — virtualized side-by-side diff table (TanStack Table + react-virtual)
- `LeaderboardTable` — sortable model leaderboard with sparklines
- `LiveRunStream` — client component consuming SSE for in-progress runs
- `EmptyState` — generic empty state with CTA

### 6.11 GitHub Action specification

`.github/workflows/eval.yml`:

```yaml
name: Eval
on:
  pull_request:
    paths: ['tests/**', 'lib/eval/**', 'app/**']
  workflow_dispatch:

jobs:
  eval:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm eval --json > eval-results.json
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
          GIT_SHA: ${{ github.sha }}
          GIT_BRANCH: ${{ github.head_ref }}
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs')
            const results = JSON.parse(fs.readFileSync('eval-results.json'))
            const body = require('./scripts/format-pr-comment.js')(results)
            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body,
            })
            if (results.regressions.length > 0) {
              core.setFailed(`Regressions: ${results.regressions.length}`)
            }
```

**PR comment format:**
- Header line: total cost, total latency, total cases, link to dashboard
- Markdown table: model | pass rate (Δ vs baseline) | cost (Δ) | avg latency (Δ)
- Section listing regressed cases (max 5 shown, with input snippet + link to full result)
- Footer: collapsible details for full per-case breakdown

### 6.12 Environment variables

`.env.example`:
```bash
# Database (Neon)
DATABASE_URL=postgres://...
DATABASE_URL_POOLED=postgres://...      # optional, recommended for serverless

# Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# Optional
GIT_SHA=                                # set automatically in CI
GIT_BRANCH=                             # set automatically in CI
EVAL_CONCURRENCY=5
PUBLIC_DEMO_MODE=false                  # if true, hides write actions in UI
```

All provider keys are server-only. The dashboard never receives them. `PUBLIC_DEMO_MODE` flips the deployed demo into read-only.

### 6.13 Deployment (Vercel + Neon)

**Vercel:**
- Framework preset: Next.js
- Region: `iad1` (closest to Neon US-East default)
- Function memory: 1024 MB for `/api/runs/*`, default for the rest
- Function timeout: API runs prefer the GitHub Action runner for long suites; in-app `POST /api/runs` is capped at the Vercel default (60s on Hobby, 300s on Pro). Suites that don't fit must be triggered via the Action.
- Build command: `pnpm build`
- Install command: `pnpm install --frozen-lockfile`

**Neon:**
- Provision via the Vercel marketplace integration (auto-injects `DATABASE_URL`)
- Two branches: `main` (prod) and `preview` (auto-created per Vercel preview deployment)
- Migrations run during build (`pnpm db:migrate` in the build script before `next build`)

### 6.14 Cost & usage accounting

Pricing table in `lib/eval/pricing.ts`. Manually maintained — provider prices change. Each entry is USD per 1M tokens:

```ts
export const PRICING: Record<string, { in: number, out: number }> = {
  'openai:gpt-5':               { in: 5.0,  out: 15.0 },
  'anthropic:claude-opus-4-7':  { in: 15.0, out: 75.0 },
  'anthropic:claude-haiku-4-5': { in: 1.0,  out: 5.0  },
  'google:gemini-2.5-pro':      { in: 1.25, out: 10.0 },
  // ...
}
```

- Unknown models default to `{ in: 0, out: 0 }` and surface a "missing pricing" warning in the UI.
- Cost stored as integer cents to avoid float rounding: `costCents = Math.round((inTok * inP + outTok * outP) * 100 / 1_000_000)`.
- Display layer divides by 100 for USD with 4-decimal precision.
- LLM-as-judge cost is computed separately and added into `result.costCents`. The score record retains `judgeCostCents` for breakdown tooltips.

### 6.15 Streaming and progress reporting

`/api/runs/:id/stream` uses Server-Sent Events. Implementation:

- Run progress is published to a Postgres `LISTEN/NOTIFY` channel keyed by `runId`
- The SSE handler subscribes via `pg`'s `Client` (not pooled — pooler doesn't forward NOTIFY)
- Fallback for environments without NOTIFY (e.g. some pooler configs): poll `results` count every 1s

Frontend: `LiveRunStream` uses native `EventSource`. Renders a progress bar, the currently-executing case's input snippet, and a rolling pass/fail count.

### 6.16 Error handling

Three categories, handled distinctly:

| Category        | Examples                                | Behavior                                        |
| --------------- | --------------------------------------- | ----------------------------------------------- |
| User error      | bad suite name, missing env, malformed  | clear message, exit 2, no Sentry                |
| Provider error  | rate limit, 5xx, timeout                | retry 3× with backoff, then record as result    |
| System error    | DB down, OOM, disk full                 | bubble up, fail the run, exit 1                 |

All errors carry a `code` (string enum) + `message`. UI shows codes in tooltips for debugging.

### 6.17 Auth & access (MVP stance)

**There is no auth in the MVP.** Single-tenant, single-user, deliberately.

Practical implications:
- The deployed demo runs in `PUBLIC_DEMO_MODE=true` — read-only UI, write API routes return 403
- Local development and the GitHub Action both bypass demo mode
- The `notes` field on a run is the only "user identity" we track

Adding auth is a sinkhole that doesn't move the portfolio needle. Defer until there's a real reason.

### 6.18 Public leaderboard

`/leaderboard/[suiteName]` is the artifact you'll share on social media and link from your resume. It's the most important page in the product.

**Requirements:**
- Server-rendered with `revalidate: 3600` (hourly)
- Columns: model, pass rate, avg cost per case, avg latency, last run, link to detail
- Sortable by every column (client island for sort)
- Auto-generated OG image via `next/og` showing the top model + delta
- "How this works" link to `/about`
- Permanent URL safe to put on a resume

**Suggested first dataset (pick one):**
- **Contract clause classification** — 50 short clauses, classify as one of 8 types. Public dataset basis: CUAD slice. *Recruiter-relevant for legaltech / B2B AI roles.*
- **Code review correctness** — 50 small diffs, judge whether a one-line review comment is correct. *Recruiter-relevant for devtools / engineering AI roles.*
- **Customer support intent classification** — 50 messages, classify as one of 6 intents. *Recruiter-relevant for general SaaS AI roles.*

Pick the one that matches the roles you want.

### 6.19 Telemetry & analytics

None for MVP beyond Vercel's built-in analytics. No PostHog, no Mixpanel, no Plausible. Ship first, instrument when there's actual demand.

### 6.20 Testing strategy

- **Unit tests (Vitest):** every scorer, the cost calculator, the prompt renderer, the suite loader. `tests/_fixtures/` holds synthetic input/output pairs.
- **Integration test:** one end-to-end test that runs `runSuite()` against a mocked provider (using AI SDK's mock) and asserts DB rows.
- **No browser E2E for MVP.** Playwright is on the roadmap, not the MVP.
- **CI runs:** typecheck, lint, vitest, plus the eval suite itself against a small `_fixtures` test set (no real provider calls in unit CI; the real eval job uses real providers).

### 6.21 Definition of done

The MVP ships when **all** of the following are true:
1. Repo has a clean `main` branch with passing CI
2. Demo URL loads in <2s on first visit
3. README has: tagline, 3-bullet pitch, architecture diagram, deploy-your-own button, 90-second Loom
4. At least one real suite with 50+ cases is in the repo and visible on the leaderboard
5. The PR bot has commented on at least one merged PR in this repo (dogfooded)
6. A blog post is published with results from the leaderboard
7. The link is in your resume / LinkedIn / portfolio site

If any of those are missing, the MVP isn't done — even if the code works.

---

## 7. Roadmap — 100 features (post-MVP)

Sourced from competitive analysis of Braintrust, Langfuse, Promptfoo, LangSmith, Arize Phoenix, DeepEval, Ragas, Lunary, Helicone, Galileo, Vellum, and Comet Opik. Numbered for tracking, **not** strictly ordered by priority. Pull into GitHub Issues as we work.

### 7.1 Core eval engine (1–15)

1. YAML test definitions (alternative to TS) for non-coders
2. Code-based custom assertion scorer (`(actual, ctx) => Score`)
3. Regex match scorer with capture-group rubrics
4. JSON Schema / Zod validation scorer
5. Numeric tolerance scorer (`within ± epsilon`)
6. Substring contains/excludes scorer
7. Embedding cosine similarity scorer
8. BLEU + ROUGE-L reference scorers
9. G-Eval style chain-of-thought judge with calibration
10. Pairwise preference scorer (Elo across model variants)
11. Multi-judge consensus with majority/median aggregation
12. Inter-judge agreement reporting (Cohen's kappa)
13. Position-bias mitigation in pairwise judges (randomize order, average)
14. Self-consistency scorer (sample N, score modal answer)
15. Custom plugin loader (`scorers/*.ts` auto-registered)

### 7.2 Providers & gateway (16–25)

16. Anthropic provider with prompt caching support
17. Google (Gemini) provider with grounding metadata capture
18. Mistral provider
19. Cohere provider
20. xAI Grok provider
21. Local models via Ollama
22. Azure OpenAI deployment routing
23. AWS Bedrock provider
24. Custom HTTP endpoint provider (BYO model)
25. Streaming token capture for time-to-first-token metric

### 7.3 Datasets & test management (26–37)

26. Dataset versioning with content-hash IDs
27. CSV import wizard
28. JSONL import wizard
29. HuggingFace dataset import (slice of MMLU, HumanEval, etc.)
30. Synthetic data generation from seed examples
31. Tagging and tag-based slicing
32. Train/eval/holdout splits with stratification
33. Dataset diff view between two versions
34. Sample weighting (some cases count more)
35. Per-case expected metadata (multiple acceptable outputs)
36. Soft-delete + restore for cases
37. Dataset export to JSONL / Parquet

### 7.4 Runs, comparison, history (38–48)

38. Run history with infinite scroll + filter (model, tag, scorer, date)
39. Run comparison view with row-level diff highlighting
40. Pin runs as named baselines
41. Three-way comparison (baseline + two candidates)
42. Run replay with same seed/temperature
43. Run notes / changelog field
44. Run metadata: git SHA, branch, author, env, prompt version
45. Cost summary per run + cumulative spend chart
46. Latency p50/p95/p99 per run
47. Token usage breakdown (input vs output) per run
48. Run tagging and starring

### 7.5 CI/CD integration (49–57)

49. GitHub Action: trigger eval on PR open/sync
50. PR comment bot with score delta table + emoji indicators
51. Configurable quality gates (block merge if score < threshold)
52. Configurable regression gates (block if delta > X% vs baseline)
53. GitHub Status Checks integration
54. GitLab CI template
55. CircleCI orb
56. Vercel deployment-ready webhook (run evals on preview)
57. Slack notifications on regression

### 7.6 Prompt management (58–66)

58. Prompt registry with semantic versioning
59. Prompt templates with typed variables (Zod-validated)
60. Side-by-side prompt diff view
61. Prompt deployment environments (dev / staging / prod)
62. Prompt rollback to any prior version
63. Prompt A/B test allocation with stat significance
64. MCP server exposing prompts to client apps
65. Prompt linting (length, banned phrases, missing variables)
66. Prompt-to-test linking (every prompt has linked eval suites)

### 7.7 Playground (67–73)

67. Interactive playground with side-by-side multi-model
68. Save playground session as a test case (one click)
69. Tool/function-calling playground with schema editor
70. Structured output playground with Zod preview
71. Image input playground (vision models)
72. Shareable playground URLs (read-only snapshot)
73. Playground history per user

### 7.8 Observability lite (74–80)

74. Optional production trace ingestion via SDK (`evalbench.log()`)
75. Trace search by content / metadata
76. Trace-to-eval conversion (one-click "turn this trace into a test case")
77. Per-user / per-feature segmentation in dashboards
78. Error-rate dashboard with grouping
79. Cost dashboard per environment
80. Anomaly alerts (latency / cost / error spikes)

### 7.9 RAG-specific evaluation (81–86)

81. Context relevance scorer (does retrieved chunk match query?)
82. Groundedness / faithfulness scorer (is answer supported by context?)
83. Answer relevance scorer (does answer address the query?)
84. Retrieval Hit@K and MRR@K metrics
85. Chunk-level inspection view
86. Reference-free RAG triad evaluation preset

### 7.10 Agent / multi-step evaluation (87–91)

87. Trajectory capture (full tool-call sequence per case)
88. Tool-call correctness scorer (right tool, right args)
89. Task completion scorer (LLM-judge on end goal)
90. Step-count and cost-per-step metrics
91. Hierarchical trace view for nested agent calls

### 7.11 Safety & red team (92–96)

92. Prompt injection test bank (curated, updateable)
93. Jailbreak attempt suite (OWASP LLM Top 10 aligned)
94. PII leak detection scorer (Presidio-backed)
95. Toxicity scorer (configurable thresholds)
96. Bias evaluation suite (demographic flips)

### 7.12 Human-in-the-loop & sharing (97–100)

97. Inline annotation UI: thumbs up/down + comment per result
98. Reviewer queue with assignment + filter
99. Public shareable run URLs (read-only, redact secrets)
100. Public report pages (markdown + embedded run charts) for blog posts

---

## 8. Competitive positioning (for README + portfolio narrative)

| Tool         | Strength we don't fight on        | Weakness we exploit                          |
| ------------ | --------------------------------- | -------------------------------------------- |
| Braintrust   | End-to-end SaaS polish            | Closed-source, $249/mo Pro, vendor lock-in   |
| Langfuse     | OSS, self-hostable, OTel          | Observability-first, eval depth is secondary |
| Promptfoo    | Red-teaming, YAML, GH Action      | Local-first, no shared dashboard / history   |
| LangSmith    | LangChain integration             | Framework lock-in, per-trace pricing         |
| Phoenix      | OTel-native production tracing    | Not eval-first, complex surface (AX/Phoenix) |
| DeepEval     | 50+ metrics, pytest-style         | No dashboard, no shared persistence          |
| Ragas        | RAG metrics depth                 | RAG-only, library not platform               |

**Our wedge:** *Code-defined tests + real comparison dashboard + GitHub-Action-native + free-to-self-host-on-Vercel.* That exact combination doesn't exist as a single product today. We're the small, opinionated default for the developer who wants Promptfoo's ergonomics with Braintrust's UI without paying for either.

---

## 9. Instructions for Claude (the AI editor)

When working in this repo:

- **Always read this file first.** If something here contradicts a request, surface it before acting.
- **Prefer small PRs.** One feature per branch. Conventional Commits.
- **Touch the schema carefully.** Any schema change ships with a Drizzle migration and a `schema.md` update.
- **Add a test with every scorer.** New scorers require both unit tests and at least one fixture in `tests/_fixtures`.
- **Update the roadmap.** When a numbered feature is complete, move it from §7 to a `CHANGELOG.md` entry referencing the issue/PR.
- **Cost-aware by default.** When suggesting LLM-as-judge configs, prefer cheaper models (Haiku, Gemini Flash) for high-volume scoring; reserve Opus / GPT-5 for the calibration set.
- **Don't introduce frameworks.** No tRPC, no NextAuth, no Zustand unless explicitly requested. The stack table in §2 is the contract.
- **Never commit secrets.** All provider keys go through `process.env`, surfaced in `.env.example`.
- **When in doubt, ship the smaller version.** This is a portfolio project, not an enterprise platform.

---

## 10. Open questions (for the human)

- [ ] Pick the dataset domain for the public leaderboard — see §6.18 for the three candidates
- [ ] Decide whether to publish the blog post on personal site, dev.to, or both
- [ ] Pick a name (`evalbench` is a placeholder — check npm + GitHub availability)
- [ ] Decide license (MIT recommended for max adoption signal)
