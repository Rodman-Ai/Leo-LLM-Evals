import { createHash } from 'node:crypto'

type MockTier = {
	id: string
	accuracy: number
	noise: number
	latencyMs: [number, number]
}

const TIERS: Record<string, MockTier> = {
	'mock:smart': { id: 'mock:smart', accuracy: 0.9, noise: 0.05, latencyMs: [400, 1200] },
	'mock:medium': { id: 'mock:medium', accuracy: 0.75, noise: 0.1, latencyMs: [200, 800] },
	'mock:weak': { id: 'mock:weak', accuracy: 0.55, noise: 0.15, latencyMs: [120, 500] },
	'mock:demo': { id: 'mock:demo', accuracy: 0.85, noise: 0.05, latencyMs: [300, 900] },
}

export function isMockModel(full: string): boolean {
	return full.startsWith('mock:')
}

export function listMockModels(): string[] {
	return Object.keys(TIERS)
}

export type MockGenerateResult = {
	text: string
	inputTokens: number
	outputTokens: number
	latencyMs: number
}

export async function mockGenerate(model: string, prompt: string): Promise<MockGenerateResult> {
	const tier = TIERS[model]
	if (!tier) {
		throw new Error(`Unknown mock model "${model}". Available: ${Object.keys(TIERS).join(', ')}`)
	}

	const seed = sha256(`${model}::${prompt}`)
	const r = randFromSeed(seed)
	const r2 = randFromSeed(seed + ':2')

	const ground = inferGroundTruth(prompt)
	const shouldBeRight = r < tier.accuracy
	const text = renderAnswer(ground, shouldBeRight, r2, tier)

	const latency = Math.round(tier.latencyMs[0] + r2 * (tier.latencyMs[1] - tier.latencyMs[0]))
	await sleep(latency)

	return {
		text,
		inputTokens: Math.ceil(prompt.length / 4),
		outputTokens: Math.ceil(text.length / 4),
		latencyMs: latency,
	}
}

type GroundTruth =
	| { kind: 'classification-binary'; correct: 'correct' | 'incorrect' }
	| { kind: 'single-word'; expected: string | null }
	| { kind: 'unknown' }

function inferGroundTruth(prompt: string): GroundTruth {
	if (/Reply with exactly one word\s+—?\s*either ["']?correct["']? or ["']?incorrect["']?/i.test(prompt)) {
		const correctness = guessCorrectness(prompt)
		return { kind: 'classification-binary', correct: correctness }
	}
	if (/Answer with a single lowercase word/i.test(prompt)) {
		const expected = guessSingleWord(prompt)
		return { kind: 'single-word', expected }
	}
	return { kind: 'unknown' }
}

function guessCorrectness(prompt: string): 'correct' | 'incorrect' {
	const reviewMatch = prompt.match(/--- review comment ---\n([\s\S]*?)$/)
	const review = reviewMatch ? reviewMatch[1].toLowerCase() : ''
	const diffMatch = prompt.match(/--- diff ---\n([\s\S]*?)\n\n--- review comment ---/)
	const diff = diffMatch ? diffMatch[1].toLowerCase() : ''

	const goodSignals = [
		'sql injection',
		'md5',
		'race condition',
		'off-by-one',
		'unmounted',
		'try/finally',
		'should be ===',
		'parameterized',
		'undefined behavior',
		'panics',
		'parseint',
		'json.parse',
	]
	for (const s of goodSignals) if (review.includes(s)) return 'correct'

	const nitpickSignals = [
		'clean recursive',
		'add a comment',
		'add type hints',
		'looks good',
		'cleaner access',
		'as unknown as',
	]
	for (const s of nitpickSignals) if (review.includes(s)) return 'incorrect'

	const realBugs = [
		/== /,
		/zerodivision/,
		/forEach.*async/i,
		/raw.*sql/i,
	]
	for (const re of realBugs) if (re.test(diff)) return 'correct'

	return 'correct'
}

function guessSingleWord(prompt: string): string | null {
	const lower = prompt.toLowerCase()
	if (lower.includes('color is the sky')) return 'blue'
	if (lower.includes('legs does a spider')) return 'eight'
	if (lower.includes('opposite of hot')) return 'cold'
	if (lower.includes('capital of france')) return 'paris'
	if (lower.includes('says "meow"') || lower.includes("says 'meow'")) return 'cat'
	return null
}

function renderAnswer(
	ground: GroundTruth,
	shouldBeRight: boolean,
	noise: number,
	tier: MockTier,
): string {
	if (ground.kind === 'classification-binary') {
		const truth = ground.correct
		const flipped = truth === 'correct' ? 'incorrect' : 'correct'
		const answer = shouldBeRight ? truth : flipped
		if (noise < tier.noise) return ` ${answer.toUpperCase()}.`
		return answer
	}
	if (ground.kind === 'single-word') {
		if (ground.expected === null) return shouldBeRight ? 'unknown' : 'unsure'
		const wrongWords: Record<string, string> = {
			blue: 'gray',
			eight: 'six',
			cold: 'warm',
			paris: 'london',
			cat: 'dog',
		}
		const answer = shouldBeRight ? ground.expected : wrongWords[ground.expected] ?? 'unknown'
		if (noise < tier.noise) return ` ${answer}.`
		return answer
	}
	return shouldBeRight ? 'ok' : 'unknown'
}

function sha256(s: string): string {
	return createHash('sha256').update(s).digest('hex')
}

function randFromSeed(seed: string): number {
	const slice = seed.slice(0, 8)
	const n = parseInt(slice, 16)
	return n / 0xffffffff
}

function sleep(ms: number) {
	return new Promise<void>((r) => setTimeout(r, ms))
}
