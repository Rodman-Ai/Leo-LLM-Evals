import { spawnSync } from 'node:child_process'

if (!process.env.DATABASE_URL) {
	console.warn('[maybe-migrate] DATABASE_URL not set — skipping migrations.')
	process.exit(0)
}

const result = spawnSync('pnpm', ['exec', 'drizzle-kit', 'migrate'], {
	stdio: 'inherit',
	env: process.env,
})

process.exit(result.status ?? 1)
