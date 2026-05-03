/**
 * Inputs every scorer receives. `input` is the raw case input (before
 * prompt rendering). `expected` is the case's reference answer if any.
 * `output` is what the model actually produced. `metadata` is whatever
 * the suite author attached to the case.
 */
export type ScoreContext = {
	input: string
	expected?: string
	output: string
	metadata: Record<string, unknown>
}

/**
 * Result of one scorer running against one case. `value` is normalized
 * 0–1 (1 = perfect). `passed` is the binary verdict the runner uses for
 * `result.passed`. `reason` shows up in the dashboard tooltip on failures.
 * `costCents` and `judgeModel` are set by judges that call an LLM — the
 * runner persists both onto the `ScoreRecord` and rolls `costCents` into
 * the result row's total cost.
 */
export type Score = {
	value: number
	passed: boolean
	reason?: string
	costCents?: number
	judgeModel?: string
}

/**
 * Implement this to add a custom scorer. `name` is what shows up in the
 * UI and the result's `scores[].scorer` field — make it stable.
 *
 * ```ts
 * const lengthUnder100: Scorer = {
 *   name: 'length-under-100',
 *   async score({ output }) {
 *     const ok = output.length < 100
 *     return { value: ok ? 1 : 0, passed: ok, reason: ok ? undefined : `${output.length} chars` }
 *   }
 * }
 * ```
 */
export type Scorer = {
	name: string
	score(ctx: ScoreContext): Promise<Score>
}

export type ExactOptions = {
	ignoreCase?: boolean
	trim?: boolean
}

/**
 * Strict-equality scorer. Compares `output` to `expected` after optional
 * trim/lowercase. Best for classification suites where the model is
 * instructed to reply with a single word.
 */
export function exact(opts: ExactOptions = {}): Scorer {
	const { ignoreCase = false, trim = true } = opts
	return {
		name: 'exact',
		async score({ output, expected }) {
			if (expected === undefined) {
				return {
					value: 0,
					passed: false,
					reason: 'exact scorer requires `expected` on the case',
				}
			}
			const a = normalize(output, { ignoreCase, trim })
			const b = normalize(expected, { ignoreCase, trim })
			const matched = a === b
			return {
				value: matched ? 1 : 0,
				passed: matched,
				reason: matched ? undefined : `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`,
			}
		},
	}
}

function normalize(value: string, opts: Required<ExactOptions>): string {
	let v = value
	if (opts.trim) v = v.trim()
	if (opts.ignoreCase) v = v.toLowerCase()
	return v
}

export type ContainsOptions = {
	substring: string
	ignoreCase?: boolean
}

/**
 * Substring-presence scorer. Passes when `substring` appears in the
 * model's output. Use when the model is allowed to be verbose but must
 * mention something specific.
 */
export function contains(opts: ContainsOptions): Scorer {
	const { substring, ignoreCase = false } = opts
	if (!substring) throw new Error('contains: substring is required')
	return {
		name: 'contains',
		async score({ output }) {
			const haystack = ignoreCase ? output.toLowerCase() : output
			const needle = ignoreCase ? substring.toLowerCase() : substring
			const matched = haystack.includes(needle)
			return {
				value: matched ? 1 : 0,
				passed: matched,
				reason: matched ? undefined : `output does not contain ${JSON.stringify(substring)}`,
			}
		},
	}
}

