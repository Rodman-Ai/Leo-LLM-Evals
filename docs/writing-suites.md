# Writing suites

A "suite" is a TypeScript file at `tests/*.eval.ts` that default-exports
a `SuiteDef`. The CLI auto-discovers everything matching that glob.

## Minimal suite

```ts
// tests/yes-no.eval.ts
import { defineSuite, exact } from '@/lib/eval'

export default defineSuite({
	name: 'yes-no',
	models: ['anthropic:claude-haiku-4-5'],
	prompt: ({ input }) => `Answer with one word — yes or no:\n${input}`,
	cases: [
		{ input: 'Is the sky blue?', expected: 'yes', scorers: [exact({ ignoreCase: true })] },
		{ input: 'Is fire cold?',   expected: 'no',  scorers: [exact({ ignoreCase: true })] },
	],
})
```

Run it: `pnpm eval --suite=yes-no`.

## `SuiteDef` reference

| Field         | Type                                        | Required | Notes                                                       |
| ------------- | ------------------------------------------- | -------- | ----------------------------------------------------------- |
| `name`        | `string`                                    | yes      | Unique. Appears in URLs (`/suites/<name>`).                 |
| `description` | `string`                                    | no       | Shown on suite + leaderboard pages.                         |
| `tags`        | `string[]`                                  | no       | Persisted on the `suites` table; future filter UI.          |
| `models`      | `string[]`                                  | yes      | Each model = one run per CLI invocation.                    |
| `prompt`      | `({ input, metadata }) => string`           | yes      | Renders the case to a string sent verbatim to the provider. |
| `concurrency` | `number`                                    | no       | In-flight provider calls per run. Default 5.                |
| `cases`       | `Case[]`                                    | yes      | At least one.                                               |

## `Case` reference

| Field      | Type                              | Required | Notes                                                    |
| ---------- | --------------------------------- | -------- | -------------------------------------------------------- |
| `input`    | `string`                          | yes      | Passed to `prompt({ input })`.                           |
| `expected` | `string`                          | no       | Reference answer; required by `exact`.                   |
| `tags`     | `string[]`                        | no       | Persisted on the `tests` table; future slicing UI.       |
| `metadata` | `Record<string, unknown>`         | no       | Passed to `prompt({ metadata })` and to scorers.         |
| `scorers`  | `Scorer[]`                        | yes      | All must pass for `result.passed` to be `true`.          |

## Idempotency

Test rows are deduped by `sha256(input + expected)` per suite. Editing a
case's input or expected creates a new test row; only the latest tags/
metadata for that hash are kept.

## Multiple models

```ts
models: [
  'anthropic:claude-opus-4-7',
  'anthropic:claude-haiku-4-5',
  'openai:gpt-5',
  'google:gemini-2.5-pro',
]
```

`pnpm eval --suite=foo` runs the suite once per model, producing one run
row each. The leaderboard (`/leaderboard/<name>`) groups runs by `(suite,
model)` and shows the latest complete run per group.

## Mock models

Demo/CI suites can include mock models alongside real ones — see
[demo-mode.md](./demo-mode.md).

## Filtering at run time

```bash
pnpm eval --suite=foo                     # all models in the suite
pnpm eval --suite=foo --model=mock:smart  # one model
pnpm eval --model=anthropic:claude-haiku-4-5   # all suites that list this model
```

## Prompts that read metadata

```ts
prompt: ({ input, metadata }) => {
  const lang = (metadata.lang as string) ?? 'english'
  return `Translate to ${lang}:\n${input}`
}
```

`metadata` is whatever you put on the case — Drizzle stores it as JSONB.
Available to scorers too.

## File discovery

The CLI walks `tests/**/*.eval.ts`, skipping files/folders starting with
`_` or `.`. To exclude a suite from auto-discovery (e.g. a draft), prefix
with `_` (`_draft.eval.ts`).

## See also

- [scorers.md](./scorers.md) — what to put in `case.scorers`.
- [cli.md](./cli.md) — how to run suites.
- [demo-mode.md](./demo-mode.md) — using `mock:*` models.
