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
		const s = await exact().score(ctx('yes', 'yes'))
		expect(s).toMatchObject({ value: 1, passed: true })
	})

	it('trims whitespace by default', async () => {
		const s = await exact().score(ctx('  yes\n', 'yes'))
		expect(s.passed).toBe(true)
	})

	it('respects ignoreCase', async () => {
		const sensitive = await exact().score(ctx('Yes', 'yes'))
		expect(sensitive.passed).toBe(false)
		const insensitive = await exact({ ignoreCase: true }).score(ctx('Yes', 'yes'))
		expect(insensitive.passed).toBe(true)
	})

	it('fails on mismatch with reason', async () => {
		const s = await exact().score(ctx('no', 'yes'))
		expect(s.value).toBe(0)
		expect(s.passed).toBe(false)
		expect(s.reason).toContain('expected')
	})

	it('fails when expected is missing', async () => {
		const s = await exact().score(ctx('anything'))
		expect(s.passed).toBe(false)
		expect(s.reason).toMatch(/requires.*expected/)
	})

	it('honors trim:false', async () => {
		const s = await exact({ trim: false }).score(ctx('yes ', 'yes'))
		expect(s.passed).toBe(false)
	})
})
