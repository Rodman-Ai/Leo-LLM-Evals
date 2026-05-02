export type ModelPricing = { in: number; out: number }

export const PRICING: Record<string, ModelPricing> = {
	'anthropic:claude-opus-4-7': { in: 15.0, out: 75.0 },
	'anthropic:claude-haiku-4-5': { in: 1.0, out: 5.0 },
	'openai:gpt-5': { in: 5.0, out: 15.0 },
	'openai:gpt-4o-mini': { in: 0.15, out: 0.6 },
	'google:gemini-2.5-pro': { in: 1.25, out: 10.0 },
	'google:gemini-1.5-flash': { in: 0.075, out: 0.3 },
	'mock:smart': { in: 0, out: 0 },
	'mock:medium': { in: 0, out: 0 },
	'mock:weak': { in: 0, out: 0 },
	'mock:demo': { in: 0, out: 0 },
}

export function pricingFor(model: string): ModelPricing | null {
	return PRICING[model] ?? null
}

export function costCents(model: string, inputTokens: number, outputTokens: number): number {
	const p = pricingFor(model)
	if (!p) return 0
	return Math.round(((inputTokens * p.in + outputTokens * p.out) * 100) / 1_000_000)
}
