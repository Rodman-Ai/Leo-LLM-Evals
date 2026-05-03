import { NextResponse } from 'next/server'
import { z } from 'zod'
import { listRuns } from '@/lib/db/queries'
import { fromUnknown, fromZod } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

const QuerySchema = z.object({
	suite: z.string().min(1).max(200).optional(),
	limit: z.coerce.number().int().min(1).max(500).optional(),
})

export async function GET(request: Request) {
	const url = new URL(request.url)
	const parsed = QuerySchema.safeParse({
		suite: url.searchParams.get('suite') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined,
	})
	if (!parsed.success) return fromZod(parsed.error)

	try {
		const runs = await listRuns({
			suiteName: parsed.data.suite,
			limit: parsed.data.limit ?? 50,
		})
		return NextResponse.json({ runs })
	} catch (err) {
		return fromUnknown(err)
	}
}
