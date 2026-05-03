import {
	pgTable,
	bigserial,
	bigint,
	integer,
	text,
	jsonb,
	timestamp,
	boolean,
	index,
	uniqueIndex,
} from 'drizzle-orm/pg-core'

export const suites = pgTable('suites', {
	id: bigserial('id', { mode: 'number' }).primaryKey(),
	name: text('name').notNull().unique(),
	description: text('description'),
	tags: text('tags').array().notNull().default([]),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tests = pgTable(
	'tests',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		suiteId: bigint('suite_id', { mode: 'number' })
			.notNull()
			.references(() => suites.id, { onDelete: 'cascade' }),
		contentHash: text('content_hash').notNull(),
		input: text('input').notNull(),
		expected: text('expected'),
		metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
		tags: text('tags').array().notNull().default([]),
	},
	(t) => ({
		hashIdx: uniqueIndex('tests_suite_hash_idx').on(t.suiteId, t.contentHash),
	}),
)

export const runs = pgTable(
	'runs',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		suiteId: bigint('suite_id', { mode: 'number' })
			.notNull()
			.references(() => suites.id),
		model: text('model').notNull(),
		promptHash: text('prompt_hash').notNull(),
		promptText: text('prompt_text').notNull(),
		status: text('status', { enum: ['running', 'complete', 'error'] }).notNull(),
		gitSha: text('git_sha'),
		gitBranch: text('git_branch'),
		triggeredBy: text('triggered_by'),
		startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
		finishedAt: timestamp('finished_at', { withTimezone: true }),
		notes: text('notes'),
		isBaseline: boolean('is_baseline').notNull().default(false),
	},
	(t) => ({
		suiteIdx: index('runs_suite_idx').on(t.suiteId),
		startedIdx: index('runs_started_idx').on(t.startedAt),
	}),
)

export type ScoreRecord = {
	scorer: string
	value: number
	passed: boolean
	reason?: string
	judgeModel?: string
	judgeCostCents?: number
}

export const results = pgTable(
	'results',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		runId: bigint('run_id', { mode: 'number' })
			.notNull()
			.references(() => runs.id, { onDelete: 'cascade' }),
		testId: bigint('test_id', { mode: 'number' })
			.notNull()
			.references(() => tests.id),
		output: text('output'),
		scores: jsonb('scores').$type<ScoreRecord[]>().notNull().default([]),
		passed: boolean('passed').notNull(),
		costCents: integer('cost_cents').notNull().default(0),
		latencyMs: integer('latency_ms').notNull().default(0),
		inputTokens: integer('input_tokens').notNull().default(0),
		outputTokens: integer('output_tokens').notNull().default(0),
		errorMessage: text('error_message'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => ({
		runTestIdx: uniqueIndex('results_run_test_idx').on(t.runId, t.testId),
	}),
)

export type Suite = typeof suites.$inferSelect
export type Test = typeof tests.$inferSelect
export type Run = typeof runs.$inferSelect
export type Result = typeof results.$inferSelect
