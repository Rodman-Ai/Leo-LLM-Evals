import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => {
	const SUITE_ROW = { id: 1 }
	const RUN_ROW = { id: 99 }
	let testIdCounter = 100

	function makeBuilder(returningValue: unknown[]) {
		const b = {
			values: vi.fn(() => b),
			onConflictDoUpdate: vi.fn(() => b),
			onConflictDoNothing: vi.fn(() => b),
			returning: vi.fn(async () => returningValue),
			then: undefined as unknown,
		}
		// Make the builder awaitable to satisfy "await db.insert(...).values(...)" when no returning() is called.
		b.then = (resolve: (v: unknown) => void) => resolve(undefined)
		return b
	}

	const insert = vi.fn((table: { _: { name: string } }) => {
		const name = (table as unknown as { [k: string]: { name: string } })._?.name ?? ''
		const lower = name.toLowerCase()
		if (lower.includes('suite')) return makeBuilder([SUITE_ROW])
		if (lower.includes('run')) return makeBuilder([RUN_ROW])
		if (lower.includes('test')) return makeBuilder([{ id: testIdCounter++ }])
		return makeBuilder([])
	})

	return {
		schema: {
			suites: { _: { name: 'suites' }, name: 'name', id: 'id' },
			runs: { _: { name: 'runs' }, id: 'id' },
			tests: {
				_: { name: 'tests' },
				suiteId: 'suite_id',
				contentHash: 'content_hash',
				id: 'id',
			},
			results: { _: { name: 'results' }, id: 'id' },
		},
		getDb: () => ({ insert }),
	}
})

let importRunFromCsv: typeof import('@/lib/imports/run').importRunFromCsv
let CsvImportError: typeof import('@/lib/imports/run').CsvImportError

beforeEach(async () => {
	vi.resetModules()
	const mod = await import('@/lib/imports/run')
	importRunFromCsv = mod.importRunFromCsv
	CsvImportError = mod.CsvImportError
})

afterEach(() => {
	vi.clearAllMocks()
})

const sampleCsv = [
	'case_id,input,expected,output,passed,scores_json,cost_cents,latency_ms,input_tokens,output_tokens,error_message',
	'1,"Q1","yes","yes",true,"[{""scorer"":""exact"",""value"":1,""passed"":true}]",10,500,5,1,',
	'2,"Q2","no","yes",false,"[{""scorer"":""exact"",""value"":0,""passed"":false}]",12,600,5,1,',
	'3,"Q3","",,false,"[]",0,0,0,0,',
].join('\n')

describe('importRunFromCsv', () => {
	it('inserts a run + result rows for each case', async () => {
		const out = await importRunFromCsv({
			csv: sampleCsv,
			suite: 'imported',
			model: 'imported:claude-haiku',
		})
		expect(out.total).toBe(3)
		expect(out.inserted).toBe(3)
		expect(out.skipped).toBe(0)
		expect(out.runId).toBe(99)
		expect(out.suiteName).toBe('imported')
	})

	it('skips rows with empty input', async () => {
		const csv = ['input,expected', '"Q1","yes"', ',', '"Q2",'].join('\n')
		const out = await importRunFromCsv({
			csv,
			suite: 'imported',
			model: 'imported:test',
		})
		expect(out.total).toBe(3)
		expect(out.inserted).toBe(2)
		expect(out.skipped).toBe(1)
	})

	it('rejects csvs missing the input column', async () => {
		await expect(
			importRunFromCsv({
				csv: 'foo,bar\n1,2\n',
				suite: 'imported',
				model: 'm',
			}),
		).rejects.toThrowError(/missing required column "input"/)
	})

	it('rejects csvs with no data rows', async () => {
		await expect(
			importRunFromCsv({ csv: 'input,expected\n', suite: 's', model: 'm' }),
		).rejects.toThrowError(/no data rows/)
	})

	it('rejects empty suite or model', async () => {
		await expect(
			importRunFromCsv({ csv: sampleCsv, suite: '   ', model: 'm' }),
		).rejects.toThrowError(CsvImportError)
		await expect(
			importRunFromCsv({ csv: sampleCsv, suite: 's', model: '' }),
		).rejects.toThrowError(CsvImportError)
	})
})
