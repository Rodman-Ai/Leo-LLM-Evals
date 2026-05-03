# CLI — `pnpm eval`

Single entrypoint at `scripts/eval.ts`. Auto-discovers suites from
`tests/**/*.eval.ts`.

## Synopsis

```
pnpm eval [--suite=<name>] [--model=<id>] [--no-db] [--json]
```

## Flags

| Flag             | Effect                                                    |
| ---------------- | --------------------------------------------------------- |
| `--suite=<name>` | Run only the named suite. Default: all discovered.        |
| `--model=<id>`   | Filter to a single model id (e.g. `anthropic:claude-haiku-4-5`). |
| `--no-db`        | Don't insert run/result rows. Useful for CI / dry runs.   |
| `--json`         | Emit NDJSON to stdout (one summary object per run).       |
| `--help`, `-h`   | Show usage.                                               |

`--suite` and `--model` can be combined.

## Exit codes

| Code | Meaning                                                                |
| ---- | ---------------------------------------------------------------------- |
| `0`  | Default mode: all cases passed. **`--json` mode: any successful run completion**, regardless of pass/fail. |
| `1`  | Default mode only: completed with one or more failing cases.           |
| `2`  | Invocation error — bad suite name, missing env, malformed args.        |

`--json` always exits `0` on completion so downstream tooling
(`scripts/quality-gate.mjs`) can decide pass/fail from the NDJSON
without the CLI failing the CI step prematurely. See [ci.md](./ci.md).

## Output

Default (TTY): colored summary table per run, then a footer with the
aggregate. Failing cases get an `✗` prefix and the scorer's `reason`.

`--json`: NDJSON. Each line is a `RunSummary`:

```ts
{
  runId: number | null,        // null if --no-db
  suiteName: string,
  model: string,
  total: number,
  passed: number,
  failed: number,
  costCents: number,
  avgLatencyMs: number,
  results: CaseResult[]
}
```

`results[]` includes per-case output, scores, cost, latency, and
`errorMessage`. The PR-comment script (`scripts/format-pr-comment.mjs`)
consumes this format directly.

## Examples

```bash
# Smoke test a new suite locally with no persistence.
pnpm eval --suite=my-new-suite --no-db

# Run the full code-review suite against every model declared in it.
pnpm eval --suite=code-review

# Compare one model's behavior across all suites.
pnpm eval --model=anthropic:claude-haiku-4-5

# Demo / CI mode — uses the deterministic mock provider.
pnpm eval --suite=code-review --model=mock:smart --no-db --json
```

## Environment

Reads from `.env.local` (Next.js convention) when run with tsx. The
relevant vars:

| Var                 | When needed                                             |
| ------------------- | ------------------------------------------------------- |
| `DATABASE_URL`      | Always except `--no-db`.                                |
| `ANTHROPIC_API_KEY` | Required when running an `anthropic:*` model.           |
| `OPENAI_API_KEY`    | Required when running an `openai:*` model.              |
| `GOOGLE_API_KEY`    | Required when running a `google:*` model.               |
| `EVAL_CONCURRENCY`  | Currently a doc placeholder; per-suite override is the supported knob. |
| `GIT_SHA` / `GIT_BRANCH` | Recorded on the run row when set.                  |

`mock:*` models need no provider keys.

## Watch / baseline modes

Not yet implemented — both are in CLAUDE.md §6.7 and in the strategic
plan as nice-to-haves. PRs welcome.
