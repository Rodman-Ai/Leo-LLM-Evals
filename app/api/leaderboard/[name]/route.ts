import { NextResponse } from 'next/server'
import { getLeaderboard } from '@/lib/db/queries'
import { apiError, fromUnknown } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

type Params = Promise<{ name: string }>

export async function GET(_request: Request, { params }: { params: Params }) {
	const { name } = await params
	const decoded = decodeURIComponent(name)
	try {
		const data = await getLeaderboard(decoded)
		if (!data.suite) return apiError(`suite "${decoded}" not found`, 'not_found', 404)
		return NextResponse.json(data)
	} catch (err) {
		return fromUnknown(err)
	}
}
