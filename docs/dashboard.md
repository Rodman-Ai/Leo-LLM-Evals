# Dashboard pages

All dashboard pages are React Server Components in `app/(dash)/` — they
query Drizzle directly inside the page function. No client-side data
fetching except for the Recharts components, which are 'use client'
islands inside server-rendered pages.

## Pages

### `/` — Recent runs

`app/(dash)/page.tsx`. Lists the latest 20 runs with pass-rate bar, model
tag, cost, latency, status. Links to `/runs/[id]` per row.

Empty state: prompts the user to run `pnpm eval --suite=toy`. DB-error
state: shows the error code so first-deploy issues are debuggable.

Query: `listRuns({ limit: 20 })`.

### `/suites`

`app/(dash)/suites/page.tsx`. Card grid of all suites. Each card shows
description, run count, latest pass rate, last run time. Links to
`/suites/[name]`.

Query: `listSuites()`.

### `/suites/[name]`

`app/(dash)/suites/[name]/page.tsx`. Three sections:

1. **Pass rate over time** — line chart, one line per model (Recharts
   `PassRateTimeline`).
2. **Latest by model** — model leaderboard table (same data as
   `/leaderboard/[name]`, no chart).
3. **Recent runs** — last 30 runs of this suite, all models.

Queries: `getLeaderboard()`, `getSuiteTimeline()`, `listRuns({ suiteName })`.

### `/runs`

`app/(dash)/runs/page.tsx`. Full run history (cap 200). URL query param
`?suite=<name>` filters to one suite.

Query: `listRuns({ limit: 200, suiteName })`.

### `/runs/[id]`

`app/(dash)/runs/[id]/page.tsx`. Single-run detail:

- Header — model, status, pass rate, total cost, avg latency, started
  at, git sha + branch.
- Collapsible prompt template.
- Per-case results table — input snippet, expected, output, score bar,
  cost, latency. Failed cases show the scorer reason inline.

Queries: `getRun()` + `getRunResults()`.

### `/compare?a=&b=`

`app/(dash)/compare/page.tsx`. Side-by-side diff of two runs. URL params
are run ids. Computes:

- Header cards for run A + B.
- Delta bars: pass rate (improved/regressed), cost, avg latency.
- Improvement / regression counts.
- Per-test table with both runs' outputs aligned.

Query: `getCompareData(aId, bId)`.

### `/leaderboard/[name]`

`app/(dash)/leaderboard/[name]/page.tsx`. Public-facing per-suite
leaderboard. `revalidate = 3600` (cached hourly).

- Bar chart of pass rate per model (Recharts `PassRateBars`, sorted desc).
- Sortable table with rank, model, pass rate, avg cost/case, latency,
  runs, latest.
- "Embed this leaderboard" snippet at the bottom (`EmbedSnippet`).

Sibling file `opengraph-image.tsx` auto-generates a 1200×630 PNG via
`next/og` for social-share cards.

Query: `getLeaderboard()`.

### `/embed/leaderboard/[name]`

`app/embed/leaderboard/[name]/page.tsx`. Chrome-less version of the
leaderboard for embedding via `<iframe>`. Lives outside the `(dash)`
route group so it doesn't render the nav. Otherwise renders the same
chart + a compact table.

### `/costs`

`app/(dash)/costs/page.tsx`. Spend overview:

- Three KPI cards: total spend, most-expensive model, most-expensive suite.
- Daily spend area chart.
- By-model + by-suite horizontal bar charts.
- Top 10 most expensive runs table.

Query: `getCostBreakdown()` (one call returns all five datasets in
parallel).

## Visual conventions

Per CLAUDE.md §6.9 + `lib/format.ts`:

- Pass rate bar: green ≥ 0.85 / yellow 0.70–0.85 / red < 0.70.
- Cost: USD with 4 decimals (`$0.0042`).
- Latency: `<1000ms` shown as ms; ≥1s switches to seconds.
- Provider colors: anthropic → orange, openai → emerald, google → blue,
  mock → slate.

## Components

| Component         | Notes                                                          |
| ----------------- | -------------------------------------------------------------- |
| `RunStatusBadge`  | Colored pill — running / complete / error.                     |
| `ScoreBar`        | Horizontal bar 0–1 with provider-color fill + percentage.      |
| `CostCell`        | Tabular-num USD with 4 decimals.                               |
| `ModelTag`        | `provider name` chip with provider color.                      |
| `EmbedSnippet`    | Client component — copy-to-clipboard `<iframe>` snippet.       |
| `charts/PassRateBars`        | Recharts BarChart, used by leaderboard + embed.     |
| `charts/PassRateTimeline`    | Recharts LineChart for suite-over-time.             |
| `charts/CostByDayLine`       | Recharts AreaChart for `/costs` daily.              |
| `charts/CostByCategory`      | Recharts horizontal BarChart for by-model/by-suite. |

## Demo-mode banner

`app/(dash)/layout.tsx` checks `process.env.PUBLIC_DEMO_MODE === 'true'`
and renders a yellow banner above the nav explaining the data is
synthetic. The embed page deliberately omits this so embedded widgets
look clean.

## DB-error fallback

Every page wraps its Drizzle query in try/catch and renders a friendly
error block instead of crashing. The message includes the underlying
error so first-time setup issues (missing `DATABASE_URL`, schema not
pushed) are obvious from the browser.
