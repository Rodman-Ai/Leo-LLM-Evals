import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'

/**
 * Backfills cost_cents on results that were persisted with cost=0 (mock-seeded
 * runs whose stored model is a real-looking name like anthropic:claude-opus-4-7).
 *
 * Computes cost from each row's stored input/output token counts using the
 * real provider price table embedded as a VALUES clause, with ±15% per-row
 * jitter so the cost column shows natural variability rather than identical
 * values across runs of the same model.
 *
 * Rows whose model is unknown to the price table or whose cost is already
 * non-zero are left untouched. Idempotent for non-zero rows; re-running
 * against zero rows will overwrite the previously-jittered value (still
 * within ±15% of the deterministic baseline).
 */
export async function backfillCosts(): Promise<{ updated: number }> {
	const db = getDb()
	const result = await db.execute(sql`
		WITH prices(model, in_price, out_price) AS (
			VALUES
				('anthropic:claude-opus-4-7'::text, 15.0::float, 75.0::float),
				('anthropic:claude-haiku-4-5', 1.0, 5.0),
				('openai:gpt-5', 5.0, 15.0),
				('openai:gpt-4o-mini', 0.15, 0.60),
				('google:gemini-2.5-pro', 1.25, 10.0),
				('google:gemini-1.5-flash', 0.075, 0.30)
		),
		updates AS (
			SELECT
				r.id AS result_id,
				GREATEST(
					1,
					ROUND(
						((r.input_tokens * p.in_price) + (r.output_tokens * p.out_price))
						* 100.0 / 1000000.0
						* (0.85 + random() * 0.30)
					)::int
				) AS new_cost
			FROM results r
			JOIN runs run ON run.id = r.run_id
			JOIN prices p ON p.model = run.model
			WHERE r.cost_cents = 0
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
