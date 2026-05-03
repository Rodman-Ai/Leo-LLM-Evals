import { createHash } from 'node:crypto'
import { getDb, schema } from '@/lib/db'
import { SuiteDefinitionSchema, type SuiteDefinitionInput } from './schema'

export type CreateSuiteResult = {
	suiteId: number
	name: string
	casesInserted: number
}

export class SuiteValidationError extends Error {
	code: string
	status: number
	details?: unknown
	constructor(message: string, code: string, status = 400, details?: unknown) {
		super(message)
		this.code = code
		this.status = status
		this.details = details
	}
}

function sha256(s: string): string {
	return createHash('sha256').update(s).digest('hex')
}

/**
 * Upserts a suite by name. If `cases` is provided, also inserts test
 * rows deduplicated by `sha256(input + expected)`. Does NOT insert runs
 * or results — running the suite is a separate concern.
 *
 * Idempotent: re-importing the same JSON updates description/tags and
 * upserts cases without duplicating existing ones.
 */
export async function createOrUpdateSuite(input: SuiteDefinitionInput): Promise<CreateSuiteResult> {
	const parsed = SuiteDefinitionSchema.safeParse(input)
	if (!parsed.success) {
		throw new SuiteValidationError(
			'invalid suite definition',
			'invalid_request',
			400,
			parsed.error.flatten(),
		)
	}
	const def = parsed.data
	const db = getDb()

	const [suiteRow] = await db
		.insert(schema.suites)
		.values({
			name: def.name,
			description: def.description ?? null,
			tags: def.tags ?? [],
		})
		.onConflictDoUpdate({
			target: schema.suites.name,
			set: {
				description: def.description ?? null,
				tags: def.tags ?? [],
			},
		})
		.returning({ id: schema.suites.id })

	const suiteId = suiteRow.id

	let casesInserted = 0
	if (def.cases?.length) {
		for (const c of def.cases) {
			const expected = c.expected ?? null
			const contentHash = sha256(`${c.input}::${expected ?? ''}`)
			await db
				.insert(schema.tests)
				.values({
					suiteId,
					contentHash,
					input: c.input,
					expected,
					metadata: c.metadata ?? {},
					tags: c.tags ?? [],
				})
				.onConflictDoUpdate({
					target: [schema.tests.suiteId, schema.tests.contentHash],
					set: {
						input: c.input,
						expected,
						metadata: c.metadata ?? {},
						tags: c.tags ?? [],
					},
				})
			casesInserted += 1
		}
	}

	return {
		suiteId,
		name: def.name,
		casesInserted,
	}
}
