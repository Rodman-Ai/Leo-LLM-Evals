import { NextResponse } from 'next/server'
import { buildRunCsv } from '@/lib/exports/run'
import { uploadCsvAsSheet } from '@/lib/integrations/google'
import { apiError, fromUnknown } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

type Params = Promise<{ id: string }>

export async function POST(request: Request, { params }: { params: Params }) {
	const { id: idStr } = await params
	const id = Number(idStr)
	if (!Number.isFinite(id) || id <= 0) {
		return apiError('id must be a positive integer', 'invalid_request', 400)
	}
	try {
		const bundle = await buildRunCsv(id)
		if (!bundle) return apiError('run not found', 'not_found', 404)
		const origin = new URL(request.url).origin
		const out = await uploadCsvAsSheet({ origin, csv: bundle.csv, title: bundle.title })
		if (!out.ok) {
			if (out.error === 'not connected') {
				return apiError('connect Google first', 'not_connected', 401)
			}
			return apiError(out.error, 'upstream_error', out.status ?? 502)
		}
		return NextResponse.json(out.result)
	} catch (err) {
		return fromUnknown(err)
	}
}
