import { createHash } from 'node:crypto'
import pLimit from 'p-limit'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/lib/db'
import { generate } from './provider'
import { costCents } from './pricing'
import type { ScoreRecord } from '@/lib/db/schema'
import type { SuiteDef, Case } from './suite'

export type RunOptions = {
	suite: SuiteDef
	model: string
	persist?: boolean
	gitSha?: string
	gitBranch?: string
	triggeredBy?: string
	onProgress?: (e: ProgressEvent) => void
}

export type ProgressEvent =
	| { kind: 'start'; total: number; runId: number | null }
	| { kind: 'case'; index: number; total: number; passed: boolean; caseInput: string }
	| { kind: 'done'; summary: RunSummary }

export type CaseResult = {
	caseInput: string
	expected: string | undefined
	output: string | null
	scores: ScoreRecord[]
	passed: boolean
	costCents: number
	latencyMs: number
	inputTokens: number
	outputTokens: number
	errorMessage: string | null
}

export type RunSummary = {
	runId: number | null
	suiteName: string
	model: string
	total: number
	passed: number
	failed: number
	costCents: number
	avgLatencyMs: number
	results: CaseResult[]
}

export async function runSuite(opts: RunOptions): Promise<RunSummary> {
	const { suite, model } = opts
	const persist = opts.persist ?? true
	const concurrency = suite.concurrency ?? 5
	const limit = pLimit(concurrency)

	const promptText = suite.prompt({ input: '__SAMPLE__', metadata: {} })
	const promptHash = sha256(`${suite.name}::${promptText}`)

	const ctx = persist ? await initializePersistence(suite, model, promptText, promptHash, opts) : null

	opts.onProgress?.({ kind: 'start', total: suite.cases.length, runId: ctx?.runId ?? null })

	const tasks = suite.cases.map((c, index) =>
		limit(async () => {
			const result = await runCase(c, suite, model)
			if (ctx) {
				const testId = ctx.testIds[index]
				await persistResult(ctx.runId, testId, result)
			}
			opts.onProgress?.({
				kind: 'case',
				index,
				total: suite.cases.length,
				passed: result.passed,
				caseInput: result.caseInput,
			})
			return result
		}),
	)

	const results = await Promise.all(tasks)

	const summary: RunSummary = {
		runId: ctx?.runId ?? null,
		suiteName: suite.name,
		model,
		total: results.length,
		passed: results.filter((r) => r.passed).length,
		failed: results.filter((r) => !r.passed).length,
		costCents: results.reduce((s, r) => s + r.costCents, 0),
		avgLatencyMs: Math.round(
			results.reduce((s, r) => s + r.latencyMs, 0) / Math.max(results.length, 1),
		),
		results,
	}

	if (ctx) {
		await finalizeRun(ctx.runId, 'complete')
	}
	opts.onProgress?.({ kind: 'done', summary })
	return summary
}

async function runCase(c: Case, suite: SuiteDef, model: string): Promise<CaseResult> {
	const metadata = c.metadata ?? {}
	const prompt = suite.prompt({ input: c.input, metadata })

	let output = ''
	let inputTokens = 0
	let outputTokens = 0
	let latencyMs = 0
	let errorMessage: string | null = null

	try {
		const gen = await generate(model, prompt)
		output = gen.text
		inputTokens = gen.inputTokens
		outputTokens = gen.outputTokens
		latencyMs = gen.latencyMs
	} catch (err) {
		errorMessage = err instanceof Error ? err.message : String(err)
	}

	const scores: ScoreRecord[] = []
	if (errorMessage === null) {
		for (const scorer of c.scorers) {
			try {
				const s = await scorer.score({
					input: c.input,
					expected: c.expected,
					output,
					metadata,
				})
				scores.push({
					scorer: scorer.name,
					value: s.value,
					passed: s.passed,
					reason: s.reason,
				})
			} catch (err) {
				scores.push({
					scorer: scorer.name,
					value: 0,
					passed: false,
					reason: `scorer error: ${err instanceof Error ? err.message : String(err)}`,
				})
			}
		}
	}

	const passed = errorMessage === null && scores.length > 0 && scores.every((s) => s.passed)

	const cost = costCents(model, inputTokens, outputTokens)

	return {
		caseInput: c.input,
		expected: c.expected,
		output: errorMessage ? null : output,
		scores,
		passed,
		costCents: cost,
		latencyMs,
		inputTokens,
		outputTokens,
		errorMessage,
	}
}

type PersistContext = {
	runId: number
	testIds: number[]
}

async function initializePersistence(
	suite: SuiteDef,
	model: string,
	promptText: string,
	promptHash: string,
	opts: RunOptions,
): Promise<PersistContext> {
	const db = getDb()

	const [suiteRow] = await db
		.insert(schema.suites)
		.values({
			name: suite.name,
			description: suite.description,
			tags: suite.tags ?? [],
		})
		.onConflictDoUpdate({
			target: schema.suites.name,
			set: { description: suite.description, tags: suite.tags ?? [] },
		})
		.returning({ id: schema.suites.id })

	const suiteId = suiteRow.id

	const testIds: number[] = []
	for (const c of suite.cases) {
		const contentHash = sha256(`${c.input}::${c.expected ?? ''}`)
		const [testRow] = await db
			.insert(schema.tests)
			.values({
				suiteId,
				contentHash,
				input: c.input,
				expected: c.expected,
				metadata: c.metadata ?? {},
				tags: c.tags ?? [],
			})
			.onConflictDoUpdate({
				target: [schema.tests.suiteId, schema.tests.contentHash],
				set: {
					input: c.input,
					expected: c.expected,
					metadata: c.metadata ?? {},
					tags: c.tags ?? [],
				},
			})
			.returning({ id: schema.tests.id })
		testIds.push(testRow.id)
	}

	const [runRow] = await db
		.insert(schema.runs)
		.values({
			suiteId,
			model,
			promptHash,
			promptText,
			status: 'running',
			gitSha: opts.gitSha ?? process.env.GIT_SHA ?? null,
			gitBranch: opts.gitBranch ?? process.env.GIT_BRANCH ?? null,
			triggeredBy: opts.triggeredBy ?? 'cli',
		})
		.returning({ id: schema.runs.id })

	return { runId: runRow.id, testIds }
}

async function persistResult(runId: number, testId: number, r: CaseResult) {
	const db = getDb()
	await db.insert(schema.results).values({
		runId,
		testId,
		output: r.output,
		scores: r.scores,
		passed: r.passed,
		costCents: r.costCents,
		latencyMs: r.latencyMs,
		inputTokens: r.inputTokens,
		outputTokens: r.outputTokens,
		errorMessage: r.errorMessage,
	})
}

async function finalizeRun(runId: number, status: 'complete' | 'error') {
	const db = getDb()
	await db
		.update(schema.runs)
		.set({ status, finishedAt: new Date() })
		.where(eq(schema.runs.id, runId))
}

function sha256(s: string): string {
	return createHash('sha256').update(s).digest('hex')
}
