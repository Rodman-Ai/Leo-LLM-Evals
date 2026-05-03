import { NextResponse } from 'next/server'
import { buildLeaderboardCsv } from '@/lib/exports/run'
import { apiError, fromUnknown } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

type Params = Promise<{ name: string }>

export async function GET(_request: Request, { params }: { params: Params }) {
	const { name } = await params
	const decoded = decodeURIComponent(name)
	try {
		const bundle = await buildLeaderboardCsv(decoded)
		if (!bundle) return apiError(`suite "${decoded}" not found`, 'not_found', 404)
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
