import { NextResponse } from 'next/server'
import { buildTemplateCsv, TEMPLATE_FILENAME } from '@/lib/imports/template'

export const dynamic = 'force-static'

export async function GET() {
	return new NextResponse(buildTemplateCsv(), {
		status: 200,
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="${TEMPLATE_FILENAME}"`,
			'cache-control': 'public, max-age=86400',
		},
	})
}
