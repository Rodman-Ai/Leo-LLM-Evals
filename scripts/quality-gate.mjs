import { readFileSync, existsSync } from 'node:fs'

const file = process.argv[2]
if (!file || !existsSync(file)) {
	console.error(`quality-gate: results file not found at ${file ?? '(missing arg)'}`)
	process.exit(2)
}

const summaries = readFileSync(file, 'utf8')
	.split('\n')
	.filter(Boolean)
	.map((line) => JSON.parse(line))

if (summaries.length === 0) {
	console.error('quality-gate: no runs to evaluate')
	process.exit(2)
}

const threshold = Number(process.env.EVAL_THRESHOLD ?? 0.5)
const totals = summaries.reduce(
	(acc, s) => ({ passed: acc.passed + s.passed, total: acc.total + s.total }),
	{ passed: 0, total: 0 },
)
const overallRate = totals.total ? totals.passed / totals.total : 0

console.log(
	`overall: ${totals.passed}/${totals.total} (${(overallRate * 100).toFixed(1)}%) · threshold ${(threshold * 100).toFixed(0)}%`,
)

if (overallRate < threshold) {
	console.error(
		`❌ pass rate ${(overallRate * 100).toFixed(1)}% is below threshold ${(threshold * 100).toFixed(0)}%`,
	)
	process.exit(1)
}

console.log(`✅ pass rate above threshold`)
