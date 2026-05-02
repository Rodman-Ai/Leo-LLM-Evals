import { describe, it, expect } from 'vitest'
import { contains } from '@/lib/eval/scorer'

const ctx = (output: string) => ({
	input: 'irrelevant',
	expected: undefined,
	output,
	metadata: {},
})

describe('contains scorer', () => {
	it('passes when substring appears', async () => {
		const s = await contains({ substring: 'apple' }).score(ctx('I like apples'))
		expect(s).toMatchObject({ value: 1, passed: true })
	})

	it('fails when substring missing', async () => {
		const s = await contains({ substring: 'banana' }).score(ctx('I like apples'))
		expect(s).toMatchObject({ value: 0, passed: false })
		expect(s.reason).toContain('does not contain')
	})

	it('is case-sensitive by default', async () => {
		const s = await contains({ substring: 'Apple' }).score(ctx('i like apples'))
		expect(s.passed).toBe(false)
	})

	it('respects ignoreCase', async () => {
		const s = await contains({ substring: 'Apple', ignoreCase: true }).score(ctx('i like apples'))
		expect(s.passed).toBe(true)
	})

	it('throws on empty substring', () => {
		expect(() => contains({ substring: '' })).toThrow(/required/)
	})
})
