import { desc, eq, sql } from 'drizzle-orm'
import { getDb, schema } from '.'

export type RunSummaryRow = {
	id: number
	suiteId: number
	suiteName: string
	model: string
	status: 'running' | 'complete' | 'error'
	startedAt: Date
	finishedAt: Date | null
	gitSha: string | null
	gitBranch: string | null
	total: number
	passed: number
	costCents: number
	avgLatencyMs: number
}

export async function listRuns(opts: { limit?: number; suiteName?: string } = {}): Promise<RunSummaryRow[]> {
	const db = getDb()
	const limit = opts.limit ?? 50

	const rows = await db
		.select({
			id: schema.runs.id,
			suiteId: schema.runs.suiteId,
			suiteName: schema.suites.name,
			model: schema.runs.model,
			status: schema.runs.status,
			startedAt: schema.runs.startedAt,
			finishedAt: schema.runs.finishedAt,
			gitSha: schema.runs.gitSha,
			gitBranch: schema.runs.gitBranch,
			total: sql<number>`coalesce(count(${schema.results.id}), 0)::int`,
			passed: sql<number>`coalesce(sum(case when ${schema.results.passed} then 1 else 0 end), 0)::int`,
			costCents: sql<number>`coalesce(sum(${schema.results.costCents}), 0)::int`,
			avgLatencyMs: sql<number>`coalesce(round(avg(${schema.results.latencyMs}))::int, 0)`,
		})
		.from(schema.runs)
		.innerJoin(schema.suites, eq(schema.runs.suiteId, schema.suites.id))
		.leftJoin(schema.results, eq(schema.results.runId, schema.runs.id))
		.where(opts.suiteName ? eq(schema.suites.name, opts.suiteName) : undefined)
		.groupBy(schema.runs.id, schema.suites.name)
		.orderBy(desc(schema.runs.startedAt))
		.limit(limit)

	return rows
}

export type RunDetail = {
	id: number
	suiteId: number
	suiteName: string
	model: string
	status: 'running' | 'complete' | 'error'
	promptText: string
	startedAt: Date
	finishedAt: Date | null
	gitSha: string | null
	gitBranch: string | null
	triggeredBy: string | null
	notes: string | null
}

export async function getRun(id: number): Promise<RunDetail | null> {
	const db = getDb()
	const [row] = await db
		.select({
			id: schema.runs.id,
			suiteId: schema.runs.suiteId,
			suiteName: schema.suites.name,
			model: schema.runs.model,
			status: schema.runs.status,
			promptText: schema.runs.promptText,
			startedAt: schema.runs.startedAt,
			finishedAt: schema.runs.finishedAt,
			gitSha: schema.runs.gitSha,
			gitBranch: schema.runs.gitBranch,
			triggeredBy: schema.runs.triggeredBy,
			notes: schema.runs.notes,
		})
		.from(schema.runs)
		.innerJoin(schema.suites, eq(schema.runs.suiteId, schema.suites.id))
		.where(eq(schema.runs.id, id))
	return row ?? null
}

export type RunResultRow = {
	id: number
	input: string
	expected: string | null
	output: string | null
	passed: boolean
	costCents: number
	latencyMs: number
	inputTokens: number
	outputTokens: number
	scores: schema.ScoreRecord[]
	errorMessage: string | null
}

export async function getRunResults(runId: number): Promise<RunResultRow[]> {
	const db = getDb()
	const rows = await db
		.select({
			id: schema.results.id,
			input: schema.tests.input,
			expected: schema.tests.expected,
			output: schema.results.output,
			passed: schema.results.passed,
			costCents: schema.results.costCents,
			latencyMs: schema.results.latencyMs,
			inputTokens: schema.results.inputTokens,
			outputTokens: schema.results.outputTokens,
			scores: schema.results.scores,
			errorMessage: schema.results.errorMessage,
		})
		.from(schema.results)
		.innerJoin(schema.tests, eq(schema.results.testId, schema.tests.id))
		.where(eq(schema.results.runId, runId))
		.orderBy(schema.results.id)
	return rows
}
