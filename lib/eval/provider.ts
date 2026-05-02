import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText, type LanguageModel } from 'ai'

export type ProviderId = 'anthropic'

export type ParsedModel = {
	provider: ProviderId
	modelId: string
	full: string
}

export function parseModel(full: string): ParsedModel {
	const idx = full.indexOf(':')
	if (idx === -1) {
		throw new Error(`Invalid model id "${full}" — expected "provider:model" (e.g. anthropic:claude-haiku-4-5)`)
	}
	const provider = full.slice(0, idx)
	const modelId = full.slice(idx + 1)
	if (provider !== 'anthropic') {
		throw new Error(
			`Provider "${provider}" not supported in Weekend 1. Only "anthropic" is wired up — Weekend 2 adds OpenAI + Google.`,
		)
	}
	return { provider, modelId, full }
}

function buildModel(parsed: ParsedModel): LanguageModel {
	if (parsed.provider === 'anthropic') {
		const apiKey = process.env.ANTHROPIC_API_KEY
		if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
		const client = createAnthropic({ apiKey })
		return client(parsed.modelId)
	}
	throw new Error(`Unhandled provider "${parsed.provider}"`)
}

export type GenerateResult = {
	text: string
	inputTokens: number
	outputTokens: number
	latencyMs: number
}

export async function generate(model: string, prompt: string): Promise<GenerateResult> {
	const parsed = parseModel(model)
	const lm = buildModel(parsed)

	let attempt = 0
	const backoffs = [1000, 4000, 16000]
	while (true) {
		const startedAt = Date.now()
		try {
			const res = await generateText({ model: lm, prompt, temperature: 0 })
			return {
				text: res.text,
				inputTokens: res.usage?.promptTokens ?? 0,
				outputTokens: res.usage?.completionTokens ?? 0,
				latencyMs: Date.now() - startedAt,
			}
		} catch (err) {
			if (attempt >= backoffs.length || !isRetryable(err)) throw err
			await sleep(backoffs[attempt])
			attempt += 1
		}
	}
}

function isRetryable(err: unknown): boolean {
	if (!err || typeof err !== 'object') return false
	const status = (err as { statusCode?: number; status?: number }).statusCode ?? (err as { status?: number }).status
	if (typeof status === 'number' && (status === 429 || status >= 500)) return true
	const message = (err as { message?: string }).message
	if (typeof message === 'string' && /(rate limit|timeout|ECONNRESET|ETIMEDOUT)/i.test(message)) return true
	return false
}

function sleep(ms: number) {
	return new Promise<void>((r) => setTimeout(r, ms))
}
