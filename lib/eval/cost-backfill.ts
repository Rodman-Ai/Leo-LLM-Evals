import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'

/**
 * Backfills cost_cents on demo-seeded result rows so the dashboard's cost
 * column shows visibly varied, model-appropriate numbers.
 *
 * Why hand-tuned per-model cents-per-case rather than pricing × tokens:
 * the schema stores cost as integer cents (CLAUDE.md §4), and at real
 * sub-cent per-case prices every cheap model rounds to the integer floor
 * and ties with every other cheap model. The demo banner makes clear that
 * outputs are synthetic, so the cost column is also illustrative — it
 * preserves the relative ordering between providers (Opus 30× Flash) at
 * absolute magnitudes that are visible.
 *
 * Only rows from `triggered_by in ('seed','api-seed')` are touched, so
 * future real-eval runs are never overwritten.
 */
export async function backfillCosts(): Promise<{ updated: number }> {
	const db = getDb()
	const result = await db.execute(sql`
		WITH demo_costs(model, base_cents) AS (
			VALUES
				('anthropic:claude-opus-4-7'::text, 31::int),
				('openai:gpt-5', 14),
				('anthropic:claude-haiku-4-5', 5),
				('google:gemini-2.5-pro', 4),
				('openai:gpt-4o-mini', 2),
				('google:gemini-1.5-flash', 1)
		),
		updates AS (
			SELECT
				r.id AS result_id,
				GREATEST(
					1,
					ROUND(d.base_cents * (0.75 + random() * 0.50))::int
				) AS new_cost
			FROM results r
			JOIN runs run ON run.id = r.run_id
			JOIN demo_costs d ON d.model = run.model
			WHERE run.triggered_by IN ('seed', 'api-seed')
		)
		UPDATE results
		SET cost_cents = updates.new_cost
		FROM updates
		WHERE results.id = updates.result_id
	`)
	const rowCount =
		typeof result === 'object' && result !== null && 'rowCount' in result
			? Number((result as { rowCount: unknown }).rowCount ?? 0)
			: 0
	return { updated: rowCount }
}
