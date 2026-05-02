import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { demoSeedAll } from '@/lib/eval/demo-seed'
import { getDb, schema } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
	const expected = process.env.SEED_TOKEN
	if (!expected) {
		return NextResponse.json(
			{ error: 'SEED_TOKEN env var is not set on the server', code: 'not_configured' },
			{ status: 503 },
		)
	}
	if (!process.env.DATABASE_URL) {
		return NextResponse.json(
			{ error: 'DATABASE_URL is not set', code: 'not_configured' },
			{ status: 503 },
		)
	}

	const url = new URL(request.url)
	const provided = url.searchParams.get('token') ?? ''
	if (!safeEqual(provided, expected)) {
		return NextResponse.json({ error: 'invalid token', code: 'unauthorized' }, { status: 401 })
	}

	const reset = url.searchParams.get('reset') === 'true'

	try {
		const startedAt = Date.now()
		if (reset) {
			const db = getDb()
			await db.execute(sql`truncate ${schema.results}, ${schema.runs} restart identity`)
		}
		const summaries = await demoSeedAll({ triggeredBy: 'api-seed' })
		return NextResponse.json({
			ok: true,
			reset,
			elapsedMs: Date.now() - startedAt,
			runs: summaries,
		})
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		return NextResponse.json({ error: message, code: 'seed_failed' }, { status: 500 })
	}
}

export const POST = GET

function safeEqual(a: string, b: string): boolean {
	const ab = Buffer.from(a)
	const bb = Buffer.from(b)
	if (ab.length !== bb.length) return false
	return timingSafeEqual(ab, bb)
}
