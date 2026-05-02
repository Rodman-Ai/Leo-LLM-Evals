import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, generateObject, type LanguageModel } from 'ai'
import type { z } from 'zod'
import { isMockModel, mockGenerate } from './mock'

export type ProviderId = 'anthropic' | 'openai' | 'google' | 'mock'

export type ParsedModel = {
	provider: ProviderId
	modelId: string
	full: string
}

const SUPPORTED: ProviderId[] = ['anthropic', 'openai', 'google', 'mock']

export function parseModel(full: string): ParsedModel {
	const idx = full.indexOf(':')
	if (idx === -1) {
		throw new Error(
			`Invalid model id "${full}" — expected "provider:model" (e.g. anthropic:claude-haiku-4-5, mock:demo)`,
		)
	}
	const provider = full.slice(0, idx) as ProviderId
	const modelId = full.slice(idx + 1)
	if (!SUPPORTED.includes(provider)) {
		throw new Error(`Provider "${provider}" not supported. Available: ${SUPPORTED.join(', ')}.`)
	}
	return { provider, modelId, full }
}

function buildModel(parsed: ParsedModel): LanguageModel {
	if (parsed.provider === 'anthropic') {
		const apiKey = process.env.ANTHROPIC_API_KEY
		if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
		return createAnthropic({ apiKey })(parsed.modelId)
	}
	if (parsed.provider === 'openai') {
		const apiKey = process.env.OPENAI_API_KEY
		if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
		return createOpenAI({ apiKey })(parsed.modelId)
	}
	if (parsed.provider === 'google') {
		const apiKey = process.env.GOOGLE_API_KEY
		if (!apiKey) throw new Error('GOOGLE_API_KEY is not set')
		return createGoogleGenerativeAI({ apiKey })(parsed.modelId)
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
	if (isMockModel(model)) {
		return mockGenerate(model, prompt)
	}
	const parsed = parseModel(model)
	const lm = buildModel(parsed)

	return withRetry(async () => {
		const startedAt = Date.now()
		const res = await generateText({ model: lm, prompt, temperature: 0 })
		return {
			text: res.text,
			inputTokens: res.usage?.promptTokens ?? 0,
			outputTokens: res.usage?.completionTokens ?? 0,
			latencyMs: Date.now() - startedAt,
		}
	})
}

export type StructuredResult<T> = {
	object: T
	inputTokens: number
	outputTokens: number
	latencyMs: number
}

export async function generateStructured<T>(
	model: string,
	prompt: string,
	schema: z.ZodType<T>,
): Promise<StructuredResult<T>> {
	if (isMockModel(model)) {
		throw new Error(
			`mock provider doesn't support structured output yet — use a real provider for llmJudge in demo mode, or stub the judge in tests.`,
		)
	}
	const parsed = parseModel(model)
	const lm = buildModel(parsed)

	return withRetry(async () => {
		const startedAt = Date.now()
		const res = await generateObject({ model: lm, prompt, schema, temperature: 0 })
		return {
			object: res.object,
			inputTokens: res.usage?.promptTokens ?? 0,
			outputTokens: res.usage?.completionTokens ?? 0,
			latencyMs: Date.now() - startedAt,
		}
	})
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
	const backoffs = [1000, 4000, 16000]
	let attempt = 0
	while (true) {
		try {
			return await fn()
		} catch (err) {
			if (attempt >= backoffs.length || !isRetryable(err)) throw err
			await sleep(backoffs[attempt])
			attempt += 1
		}
	}
}

function isRetryable(err: unknown): boolean {
	if (!err || typeof err !== 'object') return false
	const status =
		(err as { statusCode?: number; status?: number }).statusCode ??
		(err as { status?: number }).status
	if (typeof status === 'number' && (status === 429 || status >= 500)) return true
	const message = (err as { message?: string }).message
	if (typeof message === 'string' && /(rate limit|timeout|ECONNRESET|ETIMEDOUT)/i.test(message))
		return true
	return false
}

function sleep(ms: number) {
	return new Promise<void>((r) => setTimeout(r, ms))
}
