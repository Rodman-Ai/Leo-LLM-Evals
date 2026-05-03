import { NextResponse } from 'next/server'
import { getOpenApiSpec } from '@/lib/api/openapi'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
	const origin = new URL(request.url).origin
	return NextResponse.json(getOpenApiSpec(origin))
}
