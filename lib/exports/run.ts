import { getRun, getRunResults, getLeaderboard } from '@/lib/db/queries'
import { toCsv, safeFilename } from './csv'

export type RunCsvBundle = {
	csv: string
	filename: string
	title: string
}

export async function buildRunCsv(runId: number): Promise<RunCsvBundle | null> {
	const run = await getRun(runId)
	if (!run) return null
	const results = await getRunResults(runId)

	const headers = [
		'case_id',
		'input',
		'expected',
		'output',
		'passed',
		'scores_json',
		'cost_cents',
		'latency_ms',
		'input_tokens',
		'output_tokens',
		'error_message',
	]
	const rows = results.map((r) => [
		r.id,
		r.input,
		r.expected ?? '',
		r.output ?? '',
		r.passed,
		JSON.stringify(r.scores),
		r.costCents,
		r.latencyMs,
		r.inputTokens,
		r.outputTokens,
		r.errorMessage ?? '',
	])

	const filename = `${safeFilename('run', String(runId), run.suiteName, run.model)}.csv`
	const title = `${run.suiteName} · ${run.model} · run #${runId}`
	return { csv: toCsv(headers, rows), filename, title }
}

export async function buildLeaderboardCsv(suiteName: string): Promise<RunCsvBundle | null> {
	const data = await getLeaderboard(suiteName)
	if (!data.suite) return null

	const headers = [
		'rank',
		'model',
		'runs',
		'latest_run_id',
		'latest_started_at',
		'total',
		'passed',
		'pass_rate',
		'avg_cost_cents',
		'avg_latency_ms',
	]
	const rows = data.entries.map((e, i) => [
		i + 1,
		e.model,
		e.runs,
		e.latestRunId,
		new Date(e.latestStartedAt).toISOString(),
		e.total,
		e.passed,
		e.total ? +(e.passed / e.total).toFixed(6) : 0,
		e.avgCostCents,
		e.avgLatencyMs,
	])

	const filename = `${safeFilename('leaderboard', suiteName)}.csv`
	const title = `${suiteName} leaderboard`
	return { csv: toCsv(headers, rows), filename, title }
}
