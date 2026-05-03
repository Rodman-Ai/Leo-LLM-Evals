import { NextResponse } from 'next/server'
import { listSuites } from '@/lib/db/queries'
import { fromUnknown } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

export async function GET() {
	try {
		const suites = await listSuites()
		return NextResponse.json({ suites })
	} catch (err) {
		return fromUnknown(err)
	}
}
