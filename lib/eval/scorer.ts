export type ScoreContext = {
	input: string
	expected?: string
	output: string
	metadata: Record<string, unknown>
}

export type Score = {
	value: number
	passed: boolean
	reason?: string
	costCents?: number
}

export type Scorer = {
	name: string
	score(ctx: ScoreContext): Promise<Score>
}

export type ExactOptions = {
	ignoreCase?: boolean
	trim?: boolean
}

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
