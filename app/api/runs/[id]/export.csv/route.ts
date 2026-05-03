import { NextResponse } from 'next/server'
import { buildRunCsv } from '@/lib/exports/run'
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
		const bundle = await buildRunCsv(id)
		if (!bundle) return apiError('run not found', 'not_found', 404)
		return new NextResponse(bundle.csv, {
			status: 200,
			headers: {
				'content-type': 'text/csv; charset=utf-8',
				'content-disposition': `attachment; filename="${bundle.filename}"`,
				'cache-control': 'no-store',
			},
		})
	} catch (err) {
		return fromUnknown(err)
	}
}
