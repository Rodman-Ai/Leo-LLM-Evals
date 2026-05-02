import { demoSeedAll } from '@/lib/eval/demo-seed'

async function main() {
	if (!process.env.DATABASE_URL) {
		console.error('DATABASE_URL is not set. Demo seeding writes to the configured database.')
		console.error('Tip: run `vercel env pull .env.local` first, or set DATABASE_URL in your shell.')
		process.exit(2)
	}

	console.log('Seeding via mock provider…')
	const summaries = await demoSeedAll({ triggeredBy: 'cli-seed' })

	for (const s of summaries) {
		const pct = Math.round((s.passed / Math.max(s.total, 1)) * 100)
		console.log(`  ${s.suite} · ${s.model} → ${s.passed}/${s.total} (${pct}%)`)
	}
	console.log('\nDone. Visit /suites or /leaderboard/code-review to see seeded data.')
}

main().catch((err) => {
	console.error(err instanceof Error ? err.stack ?? err.message : err)
	process.exit(1)
})
