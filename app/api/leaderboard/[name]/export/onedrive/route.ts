import { NextResponse } from 'next/server'
import { buildLeaderboardCsv } from '@/lib/exports/run'
import { uploadCsvToOneDrive } from '@/lib/integrations/microsoft'
import { apiError, fromUnknown } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

type Params = Promise<{ name: string }>

export async function POST(request: Request, { params }: { params: Params }) {
	const { name } = await params
	const decoded = decodeURIComponent(name)
	try {
		const bundle = await buildLeaderboardCsv(decoded)
		if (!bundle) return apiError(`suite "${decoded}" not found`, 'not_found', 404)
		const origin = new URL(request.url).origin
		const out = await uploadCsvToOneDrive({ origin, csv: bundle.csv, filename: bundle.filename })
		if (!out.ok) {
			if (out.error === 'not connected') {
				return apiError('connect Microsoft first', 'not_connected', 401)
			}
			return apiError(out.error, 'upstream_error', out.status ?? 502)
		}
		return NextResponse.json(out.result)
	} catch (err) {
		return fromUnknown(err)
	}
}
