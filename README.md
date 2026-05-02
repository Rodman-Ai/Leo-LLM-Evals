# evalbench

Code-defined LLM evals with a real comparison dashboard. Define test cases in
TypeScript, run them across models, score with deterministic + LLM-as-judge
methods, and track regressions over time. Like `pytest` for prompts, with a
dashboard on top.

> **Status — Weekend 1 of 3.** End-to-end slice working: Anthropic provider,
> `exact` scorer, CLI runner, and three dashboard pages (`/`, `/runs`,
> `/runs/[id]`). Multi-provider, judges, comparison, and CI come in Weekends
> 2–3. See [`CLAUDE.md`](./CLAUDE.md) for the full plan.

## Demo mode (no API keys needed)

Try the dashboard end-to-end without an OpenAI / Anthropic / Google account.
A built-in `mock:*` provider returns deterministic synthetic outputs at three
quality tiers (`mock:smart`, `mock:medium`, `mock:weak`). All four mock models
are listed in every suite, so the leaderboard renders realistically.

```bash
pnpm install

# Option A — fully offline. No DB, no keys, instant feedback.
pnpm eval --suite=toy --model=mock:smart --no-db

# Option B — with a Neon database (free tier), so the dashboard is populated.
# Only DATABASE_URL is needed; no provider keys.
echo 'DATABASE_URL=postgres://...' > .env.local
pnpm db:push
pnpm db:seed                 # runs both suites against all mock models
PUBLIC_DEMO_MODE=true pnpm dev
```

Visit `http://localhost:3000/leaderboard/code-review` to see the seeded
leaderboard. Set `PUBLIC_DEMO_MODE=true` to surface a banner explaining that
results are synthetic.

`mock:*` models cost zero, return in 100–1200ms (simulated), and produce
stable outputs for a given prompt — runs are reproducible without rate limits.

## Quickstart (local)

```bash
pnpm install

# 1. Set up env. Copy .env.example → .env.local and fill in:
#      DATABASE_URL          (Neon — sign up at neon.tech)
#      ANTHROPIC_API_KEY     (console.anthropic.com)
cp .env.example .env.local

# 2. Push the schema to your Neon database.
pnpm db:push

# 3. Run the smoke-test suite (5 cases, ~$0.001 with Haiku).
pnpm eval --suite=toy

# 4. Open the dashboard.
pnpm dev
# → http://localhost:3000
```

## Commands

```bash
pnpm dev               # local dev server
pnpm eval              # run all suites locally, persist to DB
pnpm eval --suite=foo  # run one suite
pnpm eval --no-db      # dry run, skip persistence
pnpm eval --json       # NDJSON output
pnpm db:generate       # generate a migration from a schema diff
pnpm db:push           # apply schema to Neon (no migration step)
pnpm db:studio         # Drizzle Studio
pnpm test              # vitest
pnpm typecheck
pnpm lint
```

## Stack

Next.js 15 (App Router) · TypeScript strict · Drizzle + Neon Postgres · Vercel
AI SDK · Tailwind · Vitest · pnpm. See `CLAUDE.md` §2 for the full table —
those choices are locked.
