import { and, desc, eq, sql } from 'drizzle-orm'
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

export type LeaderboardEntry = {
	model: string
	runs: number
	latestRunId: number
	latestStartedAt: Date
	total: number
	passed: number
	avgCostCents: number
	avgLatencyMs: number
}

export async function getLeaderboard(suiteName: string): Promise<{
	suite: { id: number; name: string; description: string | null } | null
	entries: LeaderboardEntry[]
}> {
	const db = getDb()
	const [s] = await db
		.select({ id: schema.suites.id, name: schema.suites.name, description: schema.suites.description })
		.from(schema.suites)
		.where(eq(schema.suites.name, suiteName))
	if (!s) return { suite: null, entries: [] }

	// Latest complete run per (suiteId, model) — Postgres distinct-on equivalent via a window.
	const latestRuns = db
		.select({
			runId: schema.runs.id,
			model: schema.runs.model,
			startedAt: schema.runs.startedAt,
			rn: sql<number>`row_number() over (partition by ${schema.runs.model} order by ${schema.runs.startedAt} desc)`.as(
				'rn',
			),
		})
		.from(schema.runs)
		.where(and(eq(schema.runs.suiteId, s.id), eq(schema.runs.status, 'complete')))
		.as('latest_runs')

	const rows = await db
		.select({
			model: latestRuns.model,
			latestRunId: latestRuns.runId,
			latestStartedAt: latestRuns.startedAt,
			runs: sql<number>`(select count(*)::int from ${schema.runs} r2 where r2.suite_id = ${s.id} and r2.model = ${latestRuns.model} and r2.status = 'complete')`,
			total: sql<number>`coalesce(count(${schema.results.id}), 0)::int`,
			passed: sql<number>`coalesce(sum(case when ${schema.results.passed} then 1 else 0 end), 0)::int`,
			avgCostCents: sql<number>`coalesce(round(avg(${schema.results.costCents}))::int, 0)`,
			avgLatencyMs: sql<number>`coalesce(round(avg(${schema.results.latencyMs}))::int, 0)`,
		})
		.from(latestRuns)
		.leftJoin(schema.results, eq(schema.results.runId, latestRuns.runId))
		.where(eq(latestRuns.rn, 1))
		.groupBy(latestRuns.model, latestRuns.runId, latestRuns.startedAt)

	const entries = rows.sort((a, b) => {
		const aRate = a.total ? a.passed / a.total : 0
		const bRate = b.total ? b.passed / b.total : 0
		return bRate - aRate
	})
	return { suite: s, entries }
}

export type SuiteSummary = {
	id: number
	name: string
	description: string | null
	tags: string[]
	runCount: number
	lastRunAt: Date | null
	latestPassRate: number | null
}

export async function listSuites(): Promise<SuiteSummary[]> {
	const db = getDb()

	const suiteRows = await db
		.select({
			id: schema.suites.id,
			name: schema.suites.name,
			description: schema.suites.description,
			tags: schema.suites.tags,
			runCount: sql<number>`coalesce((select count(*)::int from ${schema.runs} r where r.suite_id = ${schema.suites.id}), 0)`,
			lastRunAt: sql<Date | null>`(select max(r.started_at) from ${schema.runs} r where r.suite_id = ${schema.suites.id})`,
		})
		.from(schema.suites)
		.orderBy(schema.suites.name)

	const result: SuiteSummary[] = []
	for (const s of suiteRows) {
		let latestPassRate: number | null = null
		if (s.runCount > 0) {
			const [latest] = await db
				.select({ id: schema.runs.id })
				.from(schema.runs)
				.where(and(eq(schema.runs.suiteId, s.id), eq(schema.runs.status, 'complete')))
				.orderBy(desc(schema.runs.startedAt))
				.limit(1)
			if (latest) {
				const [agg] = await db
					.select({
						total: sql<number>`count(*)::int`,
						passed: sql<number>`sum(case when ${schema.results.passed} then 1 else 0 end)::int`,
					})
					.from(schema.results)
					.where(eq(schema.results.runId, latest.id))
				latestPassRate = agg && agg.total > 0 ? agg.passed / agg.total : null
			}
		}
		result.push({
			id: s.id,
			name: s.name,
			description: s.description,
			tags: s.tags,
			runCount: s.runCount,
			lastRunAt: s.lastRunAt,
			latestPassRate,
		})
	}
	return result
}

export type ComparePair = {
	testId: number
	input: string
	expected: string | null
	a: ResultLite | null
	b: ResultLite | null
}

export type ResultLite = {
	output: string | null
	passed: boolean
	costCents: number
	latencyMs: number
	scores: schema.ScoreRecord[]
	errorMessage: string | null
}

export async function getCompareData(aRunId: number, bRunId: number): Promise<{
	a: RunDetail | null
	b: RunDetail | null
	pairs: ComparePair[]
}> {
	const db = getDb()
	const [a, b] = await Promise.all([getRun(aRunId), getRun(bRunId)])
	if (!a || !b) return { a, b, pairs: [] }

	const [aRows, bRows] = await Promise.all([
		db
			.select({
				testId: schema.results.testId,
				input: schema.tests.input,
				expected: schema.tests.expected,
				output: schema.results.output,
				passed: schema.results.passed,
				costCents: schema.results.costCents,
				latencyMs: schema.results.latencyMs,
				scores: schema.results.scores,
				errorMessage: schema.results.errorMessage,
			})
			.from(schema.results)
			.innerJoin(schema.tests, eq(schema.results.testId, schema.tests.id))
			.where(eq(schema.results.runId, aRunId)),
		db
			.select({
				testId: schema.results.testId,
				input: schema.tests.input,
				expected: schema.tests.expected,
				output: schema.results.output,
				passed: schema.results.passed,
				costCents: schema.results.costCents,
				latencyMs: schema.results.latencyMs,
				scores: schema.results.scores,
				errorMessage: schema.results.errorMessage,
			})
			.from(schema.results)
			.innerJoin(schema.tests, eq(schema.results.testId, schema.tests.id))
			.where(eq(schema.results.runId, bRunId)),
	])

	const byTest = new Map<number, ComparePair>()
	const upsert = (
		row: (typeof aRows)[number],
		side: 'a' | 'b',
	) => {
		const existing = byTest.get(row.testId)
		const lite: ResultLite = {
			output: row.output,
			passed: row.passed,
			costCents: row.costCents,
			latencyMs: row.latencyMs,
			scores: row.scores,
			errorMessage: row.errorMessage,
		}
		if (existing) {
			existing[side] = lite
			return
		}
		byTest.set(row.testId, {
			testId: row.testId,
			input: row.input,
			expected: row.expected,
			a: side === 'a' ? lite : null,
			b: side === 'b' ? lite : null,
		})
	}
	for (const row of aRows) upsert(row, 'a')
	for (const row of bRows) upsert(row, 'b')

	return { a, b, pairs: [...byTest.values()] }
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
