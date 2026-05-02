import { readFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) {
	console.error('usage: format-pr-comment.mjs <results.ndjson>')
	process.exit(2)
}

const summaries = readFileSync(file, 'utf8')
	.split('\n')
	.filter(Boolean)
	.map((line) => JSON.parse(line))

const threshold = Number(process.env.EVAL_THRESHOLD ?? 0.5)
const dashboard = process.env.DASHBOARD_URL ?? ''

const totals = summaries.reduce(
	(acc, s) => ({
		passed: acc.passed + s.passed,
		total: acc.total + s.total,
		costCents: acc.costCents + s.costCents,
		latencyMs: acc.latencyMs + s.avgLatencyMs * s.total,
	}),
	{ passed: 0, total: 0, costCents: 0, latencyMs: 0 },
)
const overallRate = totals.total ? totals.passed / totals.total : 0

const headerEmoji = overallRate >= threshold ? '✅' : '❌'
const lines = [
	`## ${headerEmoji} evalbench`,
	'',
	`**${totals.passed}/${totals.total} passed** (${(overallRate * 100).toFixed(1)}%) · cost $${(totals.costCents / 100).toFixed(4)} · ${summaries.length} run${summaries.length === 1 ? '' : 's'}`,
	'',
	'| Suite | Model | Pass rate | Cost | Avg latency |',
	'|---|---|---|---|---|',
]

for (const s of summaries) {
	const rate = s.total ? s.passed / s.total : 0
	const ratePct = (rate * 100).toFixed(0)
	const emoji = rate >= 0.85 ? '🟢' : rate >= threshold ? '🟡' : '🔴'
	lines.push(
		`| ${s.suiteName} | \`${s.model}\` | ${emoji} ${ratePct}% (${s.passed}/${s.total}) | $${(s.costCents / 100).toFixed(4)} | ${s.avgLatencyMs}ms |`,
	)
}

const failed = summaries.flatMap((s) =>
	s.results
		.filter((r) => !r.passed)
		.slice(0, 3)
		.map((r) => ({ suite: s.suiteName, model: s.model, ...r })),
)

if (failed.length) {
	lines.push('')
	lines.push(`<details><summary>${failed.length} failing case${failed.length === 1 ? '' : 's'} (top 3 per run)</summary>`)
	lines.push('')
	for (const f of failed) {
		const snippet = f.caseInput.length > 120 ? f.caseInput.slice(0, 117) + '…' : f.caseInput
		const reason =
			f.errorMessage ?? (f.scores.find((sc) => !sc.passed)?.reason ?? 'failed')
		lines.push(`- **${f.suite}** · \`${f.model}\` — ${snippet.replace(/\n/g, ' ')} → ${reason}`)
	}
	lines.push('')
	lines.push('</details>')
}

if (dashboard) {
	lines.push('')
	lines.push(`[Open dashboard →](${dashboard})`)
}

lines.push('')
lines.push(`<sub>Threshold: ${threshold}. Configure via repository variable \`EVAL_THRESHOLD\`.</sub>`)

process.stdout.write(lines.join('\n') + '\n')
