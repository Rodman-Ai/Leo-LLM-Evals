import type { Scorer } from './scorer'

/**
 * One test case. Has an input the model will see, an optional reference
 * `expected` answer, optional `metadata` and `tags` for slicing in the
 * dashboard, and a list of scorers — every scorer runs and a case
 * passes only if every scorer passes.
 */
export type Case = {
	input: string
	expected?: string
	tags?: string[]
	metadata?: Record<string, unknown>
	scorers: Scorer[]
}

/**
 * Renders the prompt sent to the provider for a given case. The runner
 * also calls this once with `__SAMPLE__` to compute a stable prompt hash
 * for the run row.
 */
export type PromptFn = (ctx: { input: string; metadata: Record<string, unknown> }) => string

/**
 * Suite = grouping of cases run against one or more models with a shared
 * prompt template. Files at `tests/*.eval.ts` default-export one of these
 * via `defineSuite()`.
 */
export type SuiteDef = {
	/** Unique within the project; appears in URLs (`/suites/<name>`). */
	name: string
	description?: string
	tags?: string[]
	/** Each model produces its own run row when the suite is executed. */
	models: string[]
	prompt: PromptFn
	/** Cap on in-flight provider calls per run. Default 5. */
	concurrency?: number
	cases: Case[]
}

/**
 * Validates and returns a suite definition. Use as the default export
 * of any `*.eval.ts` file.
 *
 * ```ts
 * export default defineSuite({
 *   name: 'summarization',
 *   models: ['anthropic:claude-haiku-4-5'],
 *   prompt: ({ input }) => `Summarize in one sentence:\n\n${input}`,
 *   cases: [
 *     { input: '...', expected: '...', scorers: [exact()] },
 *   ],
 * })
 * ```
 */
export function defineSuite(def: SuiteDef): SuiteDef {
	if (!def.name) throw new Error('defineSuite: name is required')
	if (!def.models?.length) throw new Error(`defineSuite(${def.name}): at least one model required`)
	if (!def.cases?.length) throw new Error(`defineSuite(${def.name}): at least one case required`)
	return def
}
