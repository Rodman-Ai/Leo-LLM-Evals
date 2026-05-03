# evalbench

> **Code-defined LLM evals with a real comparison dashboard.** Define test
> cases in TypeScript, run them across models, score with deterministic +
> LLM-as-judge methods, track regressions on every PR. Like `pytest` for
> prompts, with a dashboard on top.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Rodman-Ai/Leo-LLM-Evals)

- 🎯 **Code-first tests** — `*.eval.ts` files, type-safe, reviewable in PRs.
- 📊 **Real comparison UI** — leaderboards, per-suite timelines, three-way
  diff, cost breakdown.
- 🧪 **Deterministic + LLM judges** — `exact`, `contains`, `llmJudge` (Zod-
  validated structured output), with multi-judge consensus on the roadmap.
- 🤖 **GitHub Action native** — runs on every PR, posts a sticky comment
  with regressions, blocks merge below your threshold.
- 🟢 **Free to self-host** on Vercel + Neon free tier. Demo mode runs the
  whole app with zero provider API keys.
- 🌐 **Embeddable leaderboards + auto-generated OG images** — every
  benchmark is a shareable link.

---

## Architecture

```
 ┌──────────────────────┐       ┌─────────────────────┐
 │  /tests/*.eval.ts    │──────▶│   Eval Runner       │
 │  (Git-tracked)       │       │  (CLI / API / GHA)  │
 └──────────────────────┘       └─────────┬───────────┘
                                          │ parallel calls
                                          │  (Vercel AI SDK)
                                          ▼
                            ┌──────────────────────────┐
                            │  Anthropic / OpenAI /    │
                            │  Google / mock provider  │
                            └─────────┬────────────────┘
                                      │
                                      ▼
                            ┌──────────────────────────┐
                            │  Scorers                 │
                            │  exact / contains /      │
                            │  llmJudge                │
                            └─────────┬────────────────┘
                                      │
                                      ▼
                            ┌──────────────────────────┐
                            │   Neon Postgres          │
                            └─────────┬────────────────┘
                                      │
                                      ▼
                            ┌──────────────────────────┐
                            │  Next.js dashboard       │
                            │  /  /suites  /runs       │
                            │  /compare  /leaderboard  │
                            │  /costs                  │
                            └──────────────────────────┘
```

---

## Try it in 30 seconds (no API keys needed)

The fastest path is the deployed demo: clone this repo to Vercel, attach a
Neon DB via the Storage tab, set `SEED_TOKEN` to a random string in env vars,
and visit `https://<your-url>/api/seed?token=<that-token>`. The dashboard
populates with synthetic data across 6 frontier-model placeholders. ~2 minutes
end-to-end.

For local: `pnpm install && pnpm eval --suite=toy --model=mock:perfect --no-db`.
Runs entirely offline; `mock:perfect` is the always-passes mock tier.
Swap to `mock:smart` to see realistic ~90% accuracy with intentional misses.

## Quickstart (local with real models)

```bash
pnpm install

# 1. Copy env. ANTHROPIC_API_KEY is the only one you really need.
cp .env.example .env.local
# Fill in DATABASE_URL (Neon free tier) + ANTHROPIC_API_KEY.

# 2. Push schema.
pnpm db:push

# 3. Run a suite.
pnpm eval --suite=code-review --model=anthropic:claude-haiku-4-5

# 4. View the dashboard.
pnpm dev
```

## Demo mode (no provider keys)

A built-in `mock:*` provider returns deterministic synthetic outputs at three
quality tiers — `mock:smart`, `mock:medium`, `mock:weak`. Combined with the
`PUBLIC_DEMO_MODE=true` banner, this gives you a fully populated dashboard
with zero spend. Used for the live demo.

```bash
PUBLIC_DEMO_MODE=true pnpm dev
```

## CI / PR bot

Every PR triggers `.github/workflows/eval.yml`. The workflow:

1. Runs the configured suite (default: `code-review` × `mock:smart`).
2. Posts a sticky PR comment with pass rate, cost, latency, and the top
   failing cases.
3. Fails the check if overall pass rate falls below `EVAL_THRESHOLD`
   (configurable via repo variable, default `0.5`).

To run against real models in CI, add `ANTHROPIC_API_KEY` /
`OPENAI_API_KEY` / `GOOGLE_API_KEY` to repo secrets and set the repo variable
`EVAL_MODEL` to e.g. `anthropic:claude-haiku-4-5`.

## Commands

```bash
pnpm dev               # local dev server
pnpm eval              # run all suites
pnpm eval --suite=foo  # run one suite
pnpm eval --no-db      # dry run
pnpm eval --json       # NDJSON output (for CI)
pnpm db:push           # apply schema to Neon
pnpm db:seed           # populate DB with mock-provider runs
pnpm db:studio         # Drizzle Studio
pnpm test              # vitest
pnpm typecheck
pnpm lint
```

## Embeddable leaderboards

Every leaderboard has a chrome-less embed at
`/embed/leaderboard/[suite]` and an auto-generated OpenGraph image. On
each leaderboard page there's a copy-paste `<iframe>` snippet for blog
posts.

## Stack

Next.js 15 (App Router) · TypeScript strict · Drizzle + Neon Postgres ·
Vercel AI SDK · Tailwind + shadcn/ui · Recharts · Vitest · pnpm. The full
locked table is in [`CLAUDE.md`](./CLAUDE.md) §2.

## Documentation

| Doc | What it covers |
|---|---|
| [docs/architecture.md](./docs/architecture.md) | Codebase tour, data flow, key abstractions |
| [docs/writing-suites.md](./docs/writing-suites.md) | Defining `*.eval.ts` files |
| [docs/scorers.md](./docs/scorers.md) | Built-in scorers + writing custom ones |
| [docs/cli.md](./docs/cli.md) | `pnpm eval` reference |
| [docs/api.md](./docs/api.md) | HTTP endpoints + Swagger UI |
| [docs/webhooks.md](./docs/webhooks.md) | Outgoing webhooks (events, signing, retry) |
| [docs/exports.md](./docs/exports.md) | CSV / Google Sheets / OneDrive exports + OAuth setup |
| [docs/imports.md](./docs/imports.md) | CSV import (UI form + `POST /api/import`) |
| [docs/suites.md](./docs/suites.md) | Suite create + JSON import (`/suites/new` + `POST /api/suites`) |
| [docs/dashboard.md](./docs/dashboard.md) | Every page, what it shows |
| [docs/database.md](./docs/database.md) | Schema, migrations, cost units |
| [docs/demo-mode.md](./docs/demo-mode.md) | Mock provider, seeding, demo names |
| [docs/ci.md](./docs/ci.md) | GitHub Action + PR bot |
| [docs/deployment.md](./docs/deployment.md) | Vercel + Neon setup |
| [docs/contributing.md](./docs/contributing.md) | Local setup + house rules |

## Roadmap

100 features across 13 sprints — see [`CLAUDE.md`](./CLAUDE.md) §7 for the
full list and the strategic plan in `/root/.claude/plans/`.
