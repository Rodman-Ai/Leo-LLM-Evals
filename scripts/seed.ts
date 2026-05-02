import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { runSuite, listMockModels } from '@/lib/eval'
import type { SuiteDef } from '@/lib/eval/suite'

const SUITE_FILES = ['tests/toy.eval.ts', 'tests/code-review.eval.ts']

async function loadSuite(file: string): Promise<SuiteDef> {
	const mod = (await import(pathToFileURL(resolve(file)).href)) as { default?: SuiteDef }
	if (!mod.default) throw new Error(`${file} has no default export`)
	return mod.default
}

async function main() {
	if (!process.env.DATABASE_URL) {
		console.error('DATABASE_URL is not set. Demo seeding writes to the configured database.')
		console.error('Tip: run with `vercel env pull .env.local` first, or set DATABASE_URL in your shell.')
		process.exit(2)
	}

	const models = listMockModels()
	console.log(`Seeding ${SUITE_FILES.length} suites × ${models.length} mock models…`)

	for (const file of SUITE_FILES) {
		const suite = await loadSuite(file)
		// Override the suite's model list so we only seed against mocks.
		const seedSuite: SuiteDef = { ...suite, models }
		for (const model of models) {
			process.stdout.write(`  ${suite.name} · ${model} `)
			const summary = await runSuite({
				suite: seedSuite,
				model,
				persist: true,
				triggeredBy: 'seed',
			})
			console.log(`→ ${summary.passed}/${summary.total} (${Math.round((summary.passed / Math.max(summary.total, 1)) * 100)}%)`)
		}
	}

	console.log('\nDone. Visit /suites or /leaderboard/code-review to see seeded data.')
}

main().catch((err) => {
	console.error(err instanceof Error ? err.stack ?? err.message : err)
	process.exit(1)
})
