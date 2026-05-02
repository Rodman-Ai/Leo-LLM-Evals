# CI — GitHub Action + PR bot

`.github/workflows/eval.yml` runs on every PR that touches `tests/`,
`lib/eval/`, `app/`, or its own dependencies. Posts a sticky comment
with results and fails the check if pass rate falls below a threshold.

## Default behavior

Out of the box, the workflow runs against `mock:smart` — no secrets
required. Any fork of this repo gets a working PR bot for free.

```yaml
env:
  EVAL_MODEL: ${{ vars.EVAL_MODEL || 'mock:smart' }}
  EVAL_SUITE: ${{ vars.EVAL_SUITE || 'code-review' }}
  EVAL_THRESHOLD: ${{ vars.EVAL_THRESHOLD || '0.5' }}
```

`vars.*` reads from repository **variables** (Settings → Secrets and
variables → Actions → Variables). They're plaintext (visible) — fine for
config like model id and threshold.

## Switching to real models

Add provider keys as repo **secrets** (not variables):

| Setting             | Type   | Used for                         |
| ------------------- | ------ | -------------------------------- |
| `ANTHROPIC_API_KEY` | secret | Required for `anthropic:*` models |
| `OPENAI_API_KEY`    | secret | Required for `openai:*` models    |
| `GOOGLE_API_KEY`    | secret | Required for `google:*` models    |

Then set `EVAL_MODEL` (variable) to the model id you want, e.g.
`anthropic:claude-haiku-4-5` for cheap-and-fast or
`anthropic:claude-opus-4-7` for the rigorous gate.

## Configurable thresholds

| Variable        | Default          | Effect                                                   |
| --------------- | ---------------- | -------------------------------------------------------- |
| `EVAL_SUITE`    | `code-review`    | Which suite to run.                                      |
| `EVAL_MODEL`    | `mock:smart`     | Which model to run.                                      |
| `EVAL_THRESHOLD`| `0.5`            | Overall pass rate that gates merge.                      |
| `DASHBOARD_URL` | (empty)          | If set, the PR comment includes a link to the dashboard. |

## What the PR comment looks like

`scripts/format-pr-comment.mjs` renders the markdown from the NDJSON
output. Posted via `marocchino/sticky-pull-request-comment@v2` so
re-pushing the same PR updates the same comment instead of stacking.

```markdown
## ✅ evalbench

**47/53 passed** (88.7%) · cost $0.0042 · 1 run

| Suite | Model | Pass rate | Cost | Avg latency |
|---|---|---|---|---|
| code-review | `mock:smart` | 🟢 89% (47/53) | $0.0042 | 640ms |

<details><summary>3 failing cases (top 3 per run)</summary>
- **code-review** · `mock:smart` — Diff snippet… → expected "correct", got "incorrect"
…
</details>
```

Pass-rate emoji thresholds (per `format-pr-comment.mjs`):

- 🟢 ≥ 0.85
- 🟡 between threshold and 0.85
- 🔴 below threshold

## Quality gate

After posting the comment, `scripts/quality-gate.mjs` reads the same
NDJSON and exits non-zero if overall pass rate is below
`EVAL_THRESHOLD`. The action fails → required-status-checks block the
merge.

```
overall: 47/53 (88.7%) · threshold 50%
✅ pass rate above threshold
```

To make the gate stricter for a sensitive suite, raise the variable:
`gh variable set EVAL_THRESHOLD --body 0.95`.

## Caveats

- **Concurrency** — The action runs jobs serially per PR. If you push
  rapidly, only the latest run's comment sticks; earlier runs are
  cancelled by GitHub's cancellation rules (no explicit `concurrency`
  group is set yet — easy add).
- **DB writes** — The action runs with `--no-db` so PR runs don't
  pollute the production dashboard. Only manual `pnpm eval` and
  `/api/seed` write to Neon.
- **Cost** — With `mock:smart` the workflow costs nothing per run. With
  real models, every PR push triggers a fresh suite — multiply
  per-suite cost by your push count.

## Future / in CLAUDE.md §6.11

- GitHub Status Checks integration (separate "evalbench" check next to
  "build" / "test").
- Three-way comparison against a baseline run row, not just absolute
  threshold.
- GitLab + CircleCI templates.

All in the Sprint 15 backlog.
