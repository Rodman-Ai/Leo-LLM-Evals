import { NextResponse } from 'next/server'
import { listSuites } from '@/lib/db/queries'
import { createOrUpdateSuite, SuiteValidationError } from '@/lib/suites/create'
import { apiError, fromUnknown } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

export async function GET() {
	try {
		const suites = await listSuites()
		return NextResponse.json({ suites })
	} catch (err) {
		return fromUnknown(err)
	}
}

/**
 * Creates or updates a suite from a JSON body matching `SuiteDefinitionSchema`
 * in `lib/suites/schema.ts`. Optional `cases` populates the `tests` table;
 * runs and results are NOT inserted (running the suite is separate).
 */
export async function POST(request: Request) {
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return apiError('body must be valid JSON', 'invalid_request', 400)
	}
	try {
		const result = await createOrUpdateSuite(body as Parameters<typeof createOrUpdateSuite>[0])
		return NextResponse.json(result)
	} catch (err) {
		if (err instanceof SuiteValidationError) {
			return apiError(err.message, err.code, err.status, err.details)
		}
		return fromUnknown(err)
	}
}
