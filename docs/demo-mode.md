# Demo mode

The defining UX of evalbench — the entire app runs end-to-end without a
single provider API key. Used for the public demo and as a cheap default
in CI.

## What it is

A built-in `mock:*` provider (`lib/eval/mock.ts`) that returns
deterministic synthetic outputs at three quality tiers, plus a seed
endpoint that populates the DB with realistic-looking data using
illustrative model names.

## Tiers

| Mock id        | Accuracy | Latency range  | Notes                       |
| -------------- | -------- | -------------- | --------------------------- |
| `mock:smart`   | 0.90     | 400–1200 ms    | Stand-in for top-tier model |
| `mock:medium`  | 0.75     | 200–800 ms     | Stand-in for mid-tier       |
| `mock:weak`    | 0.55     | 120–500 ms     | Stand-in for cheap model    |
| `mock:demo`    | 0.85     | 300–900 ms     | General-purpose default     |

Per-case correctness is deterministic: `sha256(model + prompt)` seeds an
RNG, and the same prompt always produces the same output. Latency is
also deterministic per (model, prompt). Re-running the same suite
against the same model gives identical results.

## How outputs are generated

`lib/eval/mock.ts` introspects the prompt to guess what kind of answer
the suite expects:

- **Classification (`correct`/`incorrect`)** — detected from the prompt
  text (`Reply with exactly one word — either "correct" or "incorrect"`).
  Heuristics infer ground truth from the diff + comment, then the tier's
  accuracy decides whether to return the truth or its opposite.
- **Single-word answer** — detected from `Answer with a single lowercase
  word`. Hardcoded ground-truth lookup for the toy suite (`paris`,
  `blue`, etc.).
- **Anything else** — falls through to a generic `ok` / `unknown` answer.

This is intentionally fragile — it's a demo, not a model. New suite
patterns may need a few lines of detection added.

## Illustrative model names

To make the leaderboard read like a real head-to-head without actually
calling real providers, `lib/eval/demo-seed.ts` maps real-looking
model IDs to mock tiers:

| Display name (in DB)             | Executes as   |
| -------------------------------- | ------------- |
| `anthropic:claude-opus-4-7`      | `mock:smart`  |
| `openai:gpt-5`                   | `mock:smart`  |
| `anthropic:claude-haiku-4-5`     | `mock:medium` |
| `google:gemini-2.5-pro`          | `mock:medium` |
| `openai:gpt-4o-mini`             | `mock:weak`   |
| `google:gemini-1.5-flash`        | `mock:weak`   |

The runner persists the *display* name on the run row but executes
against the mapped mock tier — see the `executeAs` option in
`runSuite()`.

The `PUBLIC_DEMO_MODE=true` env var renders a banner at the top of every
dashboard page making the synthetic-data origin explicit. Always pair
demo seeding with this flag in production.

## Seeding from the deployed app

```bash
# Hit once, with your SEED_TOKEN:
curl 'https://<your-url>/api/seed?token=<token>&reset=true'
```

See [api.md](./api.md) for the full endpoint reference.

## Seeding from the CLI

```bash
pnpm db:seed
```

Same logic, different entrypoint. Reads `DATABASE_URL` from `.env.local`.

## Cost backfill

Demo runs persist `cost_cents = 0` (the mock provider has zero pricing).
The dashboard's cost column would show `$0.0000` everywhere, which kills
the cost-comparison story. The backfill endpoint fixes this:

```bash
curl 'https://<your-url>/api/seed?token=<token>&backfill=cost'
```

Runs a single SQL statement that populates `cost_cents` for demo rows
using a hand-tuned per-model table with ±25% jitter. Realistic ordering
(Opus most expensive, Flash cheapest) at amplified magnitudes so all
models show > $0. Filtered to `triggered_by IN ('seed','api-seed')` so
real evals are never overwritten.

## CI usage

`.github/workflows/eval.yml` defaults to `EVAL_MODEL=mock:smart` so the
PR action works on every fork without secrets. Forks that set real
provider keys + override `EVAL_MODEL` get real evals automatically.

## What demo mode is not

- Not appropriate for measuring real model quality. Use real keys for
  that.
- Not a substitute for the `llmJudge` scorer in tests — `llmJudge` is
  hard-blocked in mock mode (it needs structured output). Mock judges
  are listed in the strategic plan as a Sprint 5 nice-to-have.
- Not stress-tested. Vercel function timeout is 60s; the default seed
  runs ~30s. Larger suites may need to be split.
