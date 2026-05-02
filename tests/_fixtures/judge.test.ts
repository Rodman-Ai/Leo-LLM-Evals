import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/eval/provider', () => ({
	generateStructured: vi.fn(),
}))

import { llmJudge } from '@/lib/eval/judge'
import { generateStructured } from '@/lib/eval/provider'

const ctx = (output: string, expected?: string) => ({
	input: 'What is the capital of France?',
	expected,
	output,
	metadata: {},
})

const mockJudge = vi.mocked(generateStructured)

beforeEach(() => {
	mockJudge.mockReset()
})

describe('llmJudge scorer', () => {
	it('passes when score >= threshold', async () => {
		mockJudge.mockResolvedValueOnce({
			object: { score: 0.9, reasoning: 'matches the rubric' },
			inputTokens: 100,
			outputTokens: 20,
			latencyMs: 150,
		})
		const s = await llmJudge({
			rubric: 'is the answer correct',
			model: 'anthropic:claude-haiku-4-5',
		}).score(ctx('Paris', 'Paris'))
		expect(s.passed).toBe(true)
		expect(s.value).toBe(0.9)
		expect(s.reason).toContain('matches')
		expect(s.costCents).toBeGreaterThanOrEqual(0)
	})

	it('fails when score below threshold', async () => {
		mockJudge.mockResolvedValueOnce({
			object: { score: 0.4, reasoning: 'partially correct' },
			inputTokens: 100,
			outputTokens: 20,
			latencyMs: 150,
		})
		const s = await llmJudge({
			rubric: 'is the answer correct',
			model: 'anthropic:claude-haiku-4-5',
			threshold: 0.7,
		}).score(ctx('London', 'Paris'))
		expect(s.passed).toBe(false)
		expect(s.value).toBe(0.4)
	})

	it('clamps scores outside [0,1]', async () => {
		mockJudge.mockResolvedValueOnce({
			object: { score: 1.5, reasoning: 'over-confident judge' },
			inputTokens: 100,
			outputTokens: 20,
			latencyMs: 150,
		})
		const s = await llmJudge({
			rubric: 'r',
			model: 'anthropic:claude-haiku-4-5',
		}).score(ctx('answer'))
		expect(s.value).toBe(1)
	})

	it('respects custom threshold', async () => {
		mockJudge.mockResolvedValueOnce({
			object: { score: 0.6, reasoning: 'middling' },
			inputTokens: 50,
			outputTokens: 10,
			latencyMs: 100,
		})
		const lenient = llmJudge({
			rubric: 'r',
			model: 'anthropic:claude-haiku-4-5',
			threshold: 0.5,
		})
		expect((await lenient.score(ctx('x'))).passed).toBe(true)
	})

	it('throws on missing rubric', () => {
		expect(() => llmJudge({ rubric: '', model: 'anthropic:claude-haiku-4-5' })).toThrow(/rubric/)
	})
})
