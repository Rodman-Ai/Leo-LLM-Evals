import { NextResponse } from 'next/server'
import { getRun, getRunResults } from '@/lib/db/queries'
import { apiError, fromUnknown } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>

export async function GET(_request: Request, { params }: { params: Params }) {
	const { id: idStr } = await params
	const id = Number(idStr)
	if (!Number.isFinite(id) || id <= 0) {
		return apiError('id must be a positive integer', 'invalid_request', 400)
	}
	try {
		const run = await getRun(id)
		if (!run) return apiError('run not found', 'not_found', 404)
		const results = await getRunResults(id)
		return NextResponse.json({ run, results })
	} catch (err) {
		return fromUnknown(err)
	}
}
