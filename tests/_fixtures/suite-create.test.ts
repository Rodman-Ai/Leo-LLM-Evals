import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => {
	let testIdCounter = 100
	function makeBuilder(returningValue: unknown[]) {
		const b = {
			values: vi.fn(() => b),
			onConflictDoUpdate: vi.fn(() => b),
			onConflictDoNothing: vi.fn(() => b),
			returning: vi.fn(async () => returningValue),
			then: undefined as unknown,
		}
		b.then = (resolve: (v: unknown) => void) => resolve(undefined)
		return b
	}
	const insert = vi.fn((table: { _: { name: string } }) => {
		const lower = (table._?.name ?? '').toLowerCase()
		if (lower.includes('suite')) return makeBuilder([{ id: 7 }])
		if (lower.includes('test')) return makeBuilder([{ id: testIdCounter++ }])
		return makeBuilder([])
	})
	return {
		schema: {
			suites: { _: { name: 'suites' }, name: 'name', id: 'id' },
			tests: {
				_: { name: 'tests' },
				suiteId: 'suite_id',
				contentHash: 'content_hash',
				id: 'id',
			},
		},
		getDb: () => ({ insert }),
	}
})

let createOrUpdateSuite: typeof import('@/lib/suites/create').createOrUpdateSuite
let SuiteValidationError: typeof import('@/lib/suites/create').SuiteValidationError

beforeEach(async () => {
	vi.resetModules()
	const mod = await import('@/lib/suites/create')
	createOrUpdateSuite = mod.createOrUpdateSuite
	SuiteValidationError = mod.SuiteValidationError
})

afterEach(() => {
	vi.clearAllMocks()
})

describe('createOrUpdateSuite', () => {
	it('creates a suite with no cases', async () => {
		const out = await createOrUpdateSuite({ name: 'empty-suite' })
		expect(out.suiteId).toBe(7)
		expect(out.name).toBe('empty-suite')
		expect(out.casesInserted).toBe(0)
	})

	it('inserts cases when provided', async () => {
		const out = await createOrUpdateSuite({
			name: 'with-cases',
			description: 'has cases',
			tags: ['x', 'y'],
			cases: [
				{ input: 'Q1', expected: 'A1' },
				{ input: 'Q2', expected: 'A2', tags: ['easy'] },
			],
		})
		expect(out.casesInserted).toBe(2)
	})

	it('rejects empty name', async () => {
		await expect(createOrUpdateSuite({ name: '' })).rejects.toThrow(SuiteValidationError)
	})

	it('rejects bad characters in name', async () => {
		await expect(createOrUpdateSuite({ name: 'has space' })).rejects.toThrow(SuiteValidationError)
		await expect(createOrUpdateSuite({ name: 'unicode-ø' })).rejects.toThrow(SuiteValidationError)
	})

	it('rejects empty input on a case', async () => {
		await expect(
			createOrUpdateSuite({
				name: 'bad',
				cases: [{ input: '' }],
			}),
		).rejects.toThrow(SuiteValidationError)
	})

	it('accepts only metadata + ignores omitted optional fields', async () => {
		const out = await createOrUpdateSuite({ name: 'meta-only' })
		expect(out.casesInserted).toBe(0)
		expect(out.suiteId).toBe(7)
	})
})
