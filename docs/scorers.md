# Scorers

A scorer takes a `ScoreContext` and returns a `Score`. Every case lists
one or more scorers; a case passes only if all of them pass.

```ts
type Scorer = {
  name: string
  score(ctx: ScoreContext): Promise<Score>
}

type ScoreContext = {
  input: string                          // case input (pre-prompt-rendering)
  expected?: string                      // case reference, if any
  output: string                         // model's response
  metadata: Record<string, unknown>      // whatever the suite attached
}

type Score = {
  value: number                          // 0–1, 1 = perfect
  passed: boolean                        // binary verdict
  reason?: string                        // shown in the dashboard on failure
  costCents?: number                     // judges that call an LLM set this
}
```

## Built-ins

### `exact({ ignoreCase?, trim? })`

Strict equality. `expected` is required on the case.

```ts
exact()                          // case-sensitive, trimmed
exact({ ignoreCase: true })      // case-insensitive
exact({ trim: false })           // exact char-for-char
```

Best for classification suites where the model is instructed to reply
with one word.

### `contains({ substring, ignoreCase? })`

Passes when `substring` is in `output`. Use when verbose answers are
allowed but a specific phrase or token must appear.

```ts
contains({ substring: 'paris' })
contains({ substring: 'PARIS', ignoreCase: true })
```

### `llmJudge({ rubric, model, threshold? })`

Sends the case to a model with a structured-output schema (`{ score 0–1,
reasoning }`) and applies a threshold. Captures cost.

```ts
llmJudge({
  rubric: 'Does the answer correctly identify the bug in the diff?',
  model: 'anthropic:claude-haiku-4-5',
  threshold: 0.7,            // default
})
```

**Caveats**
- Single judges are biased — use a cheap model + lots of cases instead
  of one Opus per case if you want statistical leverage.
- The prompt sent to the judge isn't currently customizable beyond the
  `rubric`. Contributions welcome (Sprint 5 in the roadmap).
- Costs the judge model's per-token rate from `lib/eval/pricing.ts` and
  adds it to the result row's `cost_cents`.

## Custom scorers

Implement the `Scorer` interface and pass it in `case.scorers`. There's
no plugin loader yet — just import and reference.

```ts
// lib/scorers/length-under.ts
import type { Scorer } from '@/lib/eval'

export const lengthUnder = (n: number): Scorer => ({
  name: `length-under-${n}`,
  async score({ output }) {
    const passed = output.length < n
    return {
      value: passed ? 1 : 0,
      passed,
      reason: passed ? undefined : `output is ${output.length} chars (limit ${n})`,
    }
  },
})

// tests/conciseness.eval.ts
import { defineSuite } from '@/lib/eval'
import { lengthUnder } from '@/lib/scorers/length-under'

export default defineSuite({
  name: 'concise',
  models: ['anthropic:claude-haiku-4-5'],
  prompt: ({ input }) => `Summarize in one sentence:\n${input}`,
  cases: [
    { input: '...', scorers: [lengthUnder(120)] },
  ],
})
```

## Scorer composition

Multiple scorers per case are AND-ed:

```ts
{
  input: 'parse this date: March 15, 2024',
  expected: '2024-03-15',
  scorers: [
    exact(),                                          // must equal expected
    contains({ substring: '-' }),                     // must look like ISO
  ],
}
```

`result.passed` is true iff every scorer passed. Individual `Score` rows
are persisted in `result.scores` (JSONB), one per scorer.

## Errors

A scorer that throws is captured as `{ value: 0, passed: false, reason:
'scorer error: ...' }` — the run continues and the failure shows up on
the dashboard. The case fails, but other scorers on the same case still
run.

## Testing scorers

Unit tests live in `tests/_fixtures/<name>.test.ts` and run via Vitest.
Pattern from `tests/_fixtures/exact.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { exact } from '@/lib/eval/scorer'

const ctx = (output: string, expected?: string) => ({
  input: 'irrelevant',
  output,
  expected,
  metadata: {},
})

describe('exact scorer', () => {
  it('passes on identical strings', async () => {
    expect((await exact().score(ctx('yes', 'yes'))).passed).toBe(true)
  })
})
```

Mock the provider when testing `llmJudge` — see `tests/_fixtures/judge.test.ts`.

## Roadmap

CLAUDE.md §7.1 (re-prioritized in the strategic plan §2A) lists 13 more
scorers — regex, JSON-Schema, embedding cosine, BLEU/ROUGE, G-Eval,
pairwise Elo, multi-judge consensus, etc. Sprints 4 and 5.
