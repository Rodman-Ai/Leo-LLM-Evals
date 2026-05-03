import { readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { runSuite, type RunSummary } from '@/lib/eval'
import type { SuiteDef } from '@/lib/eval/suite'

type Flags = {
	suite: string | null
	model: string | null
	noDb: boolean
	json: boolean
	help: boolean
}

function parseFlags(argv: string[]): Flags {
	const flags: Flags = { suite: null, model: null, noDb: false, json: false, help: false }
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		if (arg === '--help' || arg === '-h') flags.help = true
		else if (arg === '--no-db') flags.noDb = true
		else if (arg === '--json') flags.json = true
		else if (arg.startsWith('--suite=')) flags.suite = arg.slice('--suite='.length)
		else if (arg.startsWith('--model=')) flags.model = arg.slice('--model='.length)
		else if (arg === '--suite') flags.suite = argv[++i] ?? null
		else if (arg === '--model') flags.model = argv[++i] ?? null
		else {
			console.error(`Unknown argument: ${arg}`)
			process.exit(2)
		}
	}
	return flags
}

function help() {
	console.log(`Usage: pnpm eval [options]

Options:
  --suite=<name>    Run only the named suite
  --model=<id>      Run against only the given model (e.g. anthropic:claude-haiku-4-5)
  --no-db           Don't persist results to the database
  --json            Emit NDJSON instead of the human-readable summary
  --help, -h        Show this help

Exit codes:
  0   all runs complete, all cases passed
  1   completed with failures
  2   invocation error
`)
}

function findEvalFiles(root: string): string[] {
	const out: string[] = []
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir)) {
			if (entry.startsWith('_') || entry.startsWith('.')) continue
			const full = join(dir, entry)
			const st = statSync(full)
			if (st.isDirectory()) walk(full)
			else if (entry.endsWith('.eval.ts')) out.push(full)
		}
	}
	walk(root)
	return out
}

async function loadSuite(file: string): Promise<SuiteDef> {
	const mod = (await import(pathToFileURL(file).href)) as { default?: SuiteDef }
	if (!mod.default) {
		throw new Error(`${file} has no default export`)
	}
	return mod.default
}

const colors = {
	reset: '\x1b[0m',
	dim: '\x1b[2m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	cyan: '\x1b[36m',
	bold: '\x1b[1m',
}

function color(c: keyof typeof colors, s: string): string {
	if (!process.stdout.isTTY) return s
	return `${colors[c]}${s}${colors.reset}`
}

function printSummary(summary: RunSummary) {
	const passRate = summary.total ? summary.passed / summary.total : 0
	const passColor = passRate >= 0.85 ? 'green' : passRate >= 0.7 ? 'yellow' : 'red'
	console.log()
	console.log(color('bold', `${summary.suiteName} · ${summary.model}`))
	console.log(
		`  ${color(passColor, `${summary.passed}/${summary.total} passed`)} ` +
			color('dim', `(${(passRate * 100).toFixed(0)}%) `) +
			color('dim', `· $${(summary.costCents / 100).toFixed(4)} `) +
			color('dim', `· avg ${summary.avgLatencyMs}ms`),
	)
	for (const r of summary.results) {
		const mark = r.passed ? color('green', '✓') : color('red', '✗')
		const snippet = r.caseInput.length > 60 ? r.caseInput.slice(0, 57) + '…' : r.caseInput
		console.log(`  ${mark} ${snippet}`)
		if (!r.passed && r.errorMessage) {
			console.log(color('red', `      error: ${r.errorMessage}`))
		} else if (!r.passed) {
			for (const s of r.scores.filter((s) => !s.passed)) {
				console.log(color('red', `      ${s.scorer}: ${s.reason ?? 'failed'}`))
			}
		}
	}
}

async function main() {
	const flags = parseFlags(process.argv.slice(2))
	if (flags.help) {
		help()
		process.exit(0)
	}

	const root = resolve(process.cwd(), 'tests')
	const files = findEvalFiles(root)
	if (files.length === 0) {
		console.error('No *.eval.ts files found under tests/')
		process.exit(2)
	}

	const suites = await Promise.all(files.map(loadSuite))
	const filtered = flags.suite ? suites.filter((s) => s.name === flags.suite) : suites
	if (filtered.length === 0) {
		console.error(`No suite matched --suite=${flags.suite}`)
		process.exit(2)
	}

	const summaries: RunSummary[] = []
	for (const suite of filtered) {
		const models = flags.model ? suite.models.filter((m) => m === flags.model) : suite.models
		if (models.length === 0) {
			if (!flags.json) {
				console.warn(
					`suite ${suite.name} doesn't list ${flags.model} — skipping. Available: ${suite.models.join(', ')}`,
				)
			}
			continue
		}
		for (const model of models) {
			const summary = await runSuite({
				suite,
				model,
				persist: !flags.noDb,
				gitSha: process.env.GIT_SHA,
				gitBranch: process.env.GIT_BRANCH,
				triggeredBy: process.env.GITHUB_ACTIONS ? 'gh-action' : 'cli',
			})
			summaries.push(summary)
			if (flags.json) {
				process.stdout.write(JSON.stringify(summary) + '\n')
			} else {
				printSummary(summary)
			}
		}
	}

	const totalFailed = summaries.reduce((s, r) => s + r.failed, 0)
	// In --json mode, runs that *completed* exit 0 regardless of failing
	// cases. Downstream tools (quality-gate.mjs in CI) decide pass/fail
	// based on the NDJSON. In TTY mode, exit 1 on any failing case so a
	// developer iterating locally gets immediate red.
	if (flags.json) {
		process.exit(0)
	}
	process.exit(totalFailed === 0 ? 0 : 1)
}

main().catch((err) => {
	console.error(err instanceof Error ? err.stack ?? err.message : err)
	process.exit(2)
})
