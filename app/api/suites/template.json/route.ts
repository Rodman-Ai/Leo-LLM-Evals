import { NextResponse } from 'next/server'
import { buildSuiteTemplate, SUITE_TEMPLATE_FILENAME } from '@/lib/suites/template'

export const dynamic = 'force-static'

export async function GET() {
	return new NextResponse(buildSuiteTemplate(), {
		status: 200,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'content-disposition': `attachment; filename="${SUITE_TEMPLATE_FILENAME}"`,
			'cache-control': 'public, max-age=86400',
		},
	})
}
