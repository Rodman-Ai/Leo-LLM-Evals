import { createHash } from 'node:crypto'
import { getDb, schema } from '@/lib/db'
import type { ScoreRecord } from '@/lib/db/schema'
import { parseCsv } from './csv'

export type ImportInput = {
	csv: string
	suite: string
	model: string
	prompt?: string
	notes?: string
	gitSha?: string
	gitBranch?: string
}

export type ImportResult = {
	runId: number
	suiteId: number
	suiteName: string
	model: string
	total: number
	inserted: number
	skipped: number
}

export class CsvImportError extends Error {
	code: string
	status: number
	constructor(message: string, code: string, status = 400) {
		super(message)
		this.code = code
		this.status = status
	}
}

const REQUIRED_COLUMNS = ['input'] as const

function sha256(s: string): string {
	return createHash('sha256').update(s).digest('hex')
}

function parseBool(value: string): boolean {
	const v = value.trim().toLowerCase()
	return v === 'true' || v === '1' || v === 'yes' || v === 't'
}

function parseInt0(value: string): number {
	const n = parseInt(value, 10)
	return Number.isFinite(n) ? n : 0
}

function parseScores(value: string): ScoreRecord[] {
	if (!value.trim()) return []
	try {
		const parsed: unknown = JSON.parse(value)
		if (Array.isArray(parsed)) return parsed as ScoreRecord[]
		return []
	} catch {
		return []
	}
}

/**
 * Parses `csv` and inserts a new run with `source='import'` results.
 *
 * Suite is auto-created if missing. Test rows are upserted by content
 * hash so re-importing the same CSV doesn't duplicate the case
 * inventory. The run row carries `triggered_by='import'`, which the
 * `runner.ts` webhook dispatcher treats as a no-fire trigger.
 */
export async function importRunFromCsv(input: ImportInput): Promise<ImportResult> {
	if (!input.suite?.trim()) {
		throw new CsvImportError('suite name is required', 'invalid_request')
	}
	if (!input.model?.trim()) {
		throw new CsvImportError('model is required', 'invalid_request')
	}

	const parsed = parseCsv(input.csv)
	if (parsed.headers.length === 0) {
		throw new CsvImportError('csv has no header row', 'invalid_csv')
	}
	for (const required of REQUIRED_COLUMNS) {
		if (!parsed.headers.includes(required)) {
			throw new CsvImportError(
				`missing required column "${required}"`,
				'invalid_csv',
			)
		}
	}
	if (parsed.rows.length === 0) {
		throw new CsvImportError('csv has no data rows', 'invalid_csv')
	}

	const db = getDb()
	const suiteName = input.suite.trim()
	const promptText = (input.prompt ?? `Imported via CSV upload at ${new Date().toISOString()}`).trim()
	const promptHash = sha256(`${suiteName}::${promptText}`)

	const [suiteRow] = await db
		.insert(schema.suites)
		.values({ name: suiteName, description: null, tags: [] })
		.onConflictDoUpdate({
			target: schema.suites.name,
			set: { name: suiteName },
		})
		.returning({ id: schema.suites.id })
	const suiteId = suiteRow.id

	const [runRow] = await db
		.insert(schema.runs)
		.values({
			suiteId,
			model: input.model.trim(),
			promptHash,
			promptText,
			status: 'complete',
			gitSha: input.gitSha ?? null,
			gitBranch: input.gitBranch ?? null,
			triggeredBy: 'import',
			notes: input.notes ?? null,
			finishedAt: new Date(),
		})
		.returning({ id: schema.runs.id })
	const runId = runRow.id

	let inserted = 0
	let skipped = 0

	for (const row of parsed.rows) {
		const inputCell = row.input
		if (!inputCell?.trim()) {
			skipped += 1
			continue
		}
		const expected = row.expected || null
		const contentHash = sha256(`${inputCell}::${expected ?? ''}`)

		const [testRow] = await db
			.insert(schema.tests)
			.values({
				suiteId,
				contentHash,
				input: inputCell,
				expected,
				metadata: {},
				tags: [],
			})
			.onConflictDoUpdate({
				target: [schema.tests.suiteId, schema.tests.contentHash],
				set: { input: inputCell, expected },
			})
			.returning({ id: schema.tests.id })

		await db
			.insert(schema.results)
			.values({
				runId,
				testId: testRow.id,
				output: row.output || null,
				scores: parseScores(row.scores_json ?? ''),
				passed: parseBool(row.passed ?? ''),
				costCents: parseInt0(row.cost_cents ?? ''),
				latencyMs: parseInt0(row.latency_ms ?? ''),
				inputTokens: parseInt0(row.input_tokens ?? ''),
				outputTokens: parseInt0(row.output_tokens ?? ''),
				errorMessage: row.error_message || null,
				source: 'import',
			})
			.onConflictDoNothing()
		inserted += 1
	}

	return {
		runId,
		suiteId,
		suiteName,
		model: input.model.trim(),
		total: parsed.rows.length,
		inserted,
		skipped,
	}
}
