import { and, desc, eq, lt, sql } from 'drizzle-orm'
import { getDb, schema } from '.'

export type WebhookRow = typeof schema.webhooks.$inferSelect
export type WebhookDeliveryRow = typeof schema.webhookDeliveries.$inferSelect

export async function getWebhooks(): Promise<WebhookRow[]> {
	const db = getDb()
	return db.select().from(schema.webhooks).orderBy(schema.webhooks.event)
}

export async function getWebhook(event: string): Promise<WebhookRow | null> {
	const db = getDb()
	const [row] = await db.select().from(schema.webhooks).where(eq(schema.webhooks.event, event))
	return row ?? null
}

export async function setWebhook(input: {
	event: string
	url: string | null
	enabled: boolean
	secret: string | null
}): Promise<WebhookRow> {
	const db = getDb()
	const [row] = await db
		.insert(schema.webhooks)
		.values({
			event: input.event,
			url: input.url,
			enabled: input.enabled,
			secret: input.secret,
		})
		.onConflictDoUpdate({
			target: schema.webhooks.event,
			set: {
				url: input.url,
				enabled: input.enabled,
				secret: input.secret,
				updatedAt: new Date(),
			},
		})
		.returning()
	return row
}

export async function recordDelivery(input: {
	webhookId: number
	event: string
	payload: unknown
	statusCode: number | null
	responseBody: string | null
	succeeded: boolean
	errorMessage: string | null
	durationMs: number
}): Promise<WebhookDeliveryRow> {
	const db = getDb()
	const [row] = await db
		.insert(schema.webhookDeliveries)
		.values({
			webhookId: input.webhookId,
			event: input.event,
			payload: input.payload as Record<string, unknown>,
			statusCode: input.statusCode,
			responseBody: input.responseBody,
			succeeded: input.succeeded,
			errorMessage: input.errorMessage,
			durationMs: input.durationMs,
		})
		.returning()
	return row
}

export async function listDeliveries(opts: {
	event?: string
	limit?: number
}): Promise<WebhookDeliveryRow[]> {
	const db = getDb()
	const limit = opts.limit ?? 20
	return db
		.select()
		.from(schema.webhookDeliveries)
		.where(opts.event ? eq(schema.webhookDeliveries.event, opts.event) : undefined)
		.orderBy(desc(schema.webhookDeliveries.attemptedAt))
		.limit(limit)
}

/**
 * Most recent complete run for `(suiteId, model)` started strictly before
 * `beforeRunId`. Used by the regression-detection webhook trigger to find
 * the baseline to compare against.
 */
export async function getPreviousRun(
	suiteId: number,
	model: string,
	beforeRunId: number,
): Promise<{ id: number; passed: number; total: number } | null> {
	const db = getDb()
	const [row] = await db
		.select({
			id: schema.runs.id,
			passed: sql<number>`coalesce(sum(case when ${schema.results.passed} then 1 else 0 end), 0)::int`,
			total: sql<number>`coalesce(count(${schema.results.id}), 0)::int`,
		})
		.from(schema.runs)
		.leftJoin(schema.results, eq(schema.results.runId, schema.runs.id))
		.where(
			and(
				eq(schema.runs.suiteId, suiteId),
				eq(schema.runs.model, model),
				eq(schema.runs.status, 'complete'),
				lt(schema.runs.id, beforeRunId),
			),
		)
		.groupBy(schema.runs.id)
		.orderBy(desc(schema.runs.id))
		.limit(1)
	return row ?? null
}

export type CostByDayRow = { day: string; costCents: number; runs: number }
export type CostByModelRow = { model: string; costCents: number; runs: number }
export type CostBySuiteRow = { suiteName: string; costCents: number; runs: number }
export type TopRunRow = {
	id: number
	suiteName: string
	model: string
	costCents: number
	startedAt: Date
}

export async function getCostBreakdown(): Promise<{
	totalCents: number
	byDay: CostByDayRow[]
	byModel: CostByModelRow[]
	bySuite: CostBySuiteRow[]
	topRuns: TopRunRow[]
}> {
	const db = getDb()

	const [byDay, byModel, bySuite, topRuns, totalRow] = await Promise.all([
		db
			.select({
				day: sql<string>`to_char(${schema.runs.startedAt}, 'YYYY-MM-DD')`,
				costCents: sql<number>`coalesce(sum(${schema.results.costCents}), 0)::int`,
				runs: sql<number>`count(distinct ${schema.runs.id})::int`,
			})
			.from(schema.runs)
			.leftJoin(schema.results, eq(schema.results.runId, schema.runs.id))
			.where(eq(schema.runs.status, 'complete'))
			.groupBy(sql`to_char(${schema.runs.startedAt}, 'YYYY-MM-DD')`)
			.orderBy(sql`to_char(${schema.runs.startedAt}, 'YYYY-MM-DD')`),
		db
			.select({
				model: schema.runs.model,
				costCents: sql<number>`coalesce(sum(${schema.results.costCents}), 0)::int`,
				runs: sql<number>`count(distinct ${schema.runs.id})::int`,
			})
			.from(schema.runs)
			.leftJoin(schema.results, eq(schema.results.runId, schema.runs.id))
			.where(eq(schema.runs.status, 'complete'))
			.groupBy(schema.runs.model)
			.orderBy(sql`coalesce(sum(${schema.results.costCents}), 0) desc`),
		db
			.select({
				suiteName: schema.suites.name,
				costCents: sql<number>`coalesce(sum(${schema.results.costCents}), 0)::int`,
				runs: sql<number>`count(distinct ${schema.runs.id})::int`,
			})
			.from(schema.suites)
			.leftJoin(schema.runs, eq(schema.runs.suiteId, schema.suites.id))
			.leftJoin(schema.results, eq(schema.results.runId, schema.runs.id))
			.where(eq(schema.runs.status, 'complete'))
			.groupBy(schema.suites.name)
			.orderBy(sql`coalesce(sum(${schema.results.costCents}), 0) desc`),
		db
			.select({
				id: schema.runs.id,
				suiteName: schema.suites.name,
				model: schema.runs.model,
				costCents: sql<number>`coalesce(sum(${schema.results.costCents}), 0)::int`,
				startedAt: schema.runs.startedAt,
			})
			.from(schema.runs)
			.innerJoin(schema.suites, eq(schema.suites.id, schema.runs.suiteId))
			.leftJoin(schema.results, eq(schema.results.runId, schema.runs.id))
			.where(eq(schema.runs.status, 'complete'))
			.groupBy(schema.runs.id, schema.suites.name)
			.orderBy(sql`coalesce(sum(${schema.results.costCents}), 0) desc`)
			.limit(10),
		db
			.select({
				totalCents: sql<number>`coalesce(sum(${schema.results.costCents}), 0)::int`,
			})
			.from(schema.results),
	])

	return {
		totalCents: totalRow[0]?.totalCents ?? 0,
		byDay,
		byModel,
		bySuite,
		topRuns,
	}
}

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

export type TimelineRunRow = {
	runId: number
	startedAt: Date
	model: string
	total: number
	passed: number
}

export async function getSuiteTimeline(
	suiteName: string,
	limit = 100,
): Promise<TimelineRunRow[]> {
	const db = getDb()
	const rows = await db
		.select({
			runId: schema.runs.id,
			startedAt: schema.runs.startedAt,
			model: schema.runs.model,
			total: sql<number>`coalesce(count(${schema.results.id}), 0)::int`,
			passed: sql<number>`coalesce(sum(case when ${schema.results.passed} then 1 else 0 end), 0)::int`,
		})
		.from(schema.runs)
		.innerJoin(schema.suites, eq(schema.runs.suiteId, schema.suites.id))
		.leftJoin(schema.results, eq(schema.results.runId, schema.runs.id))
		.where(and(eq(schema.suites.name, suiteName), eq(schema.runs.status, 'complete')))
		.groupBy(schema.runs.id)
		.orderBy(desc(schema.runs.startedAt))
		.limit(limit)
	// Pulled newest-first so the limit retains the most recent runs;
	// the chart still renders chronologically left-to-right.
	return rows.reverse()
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
