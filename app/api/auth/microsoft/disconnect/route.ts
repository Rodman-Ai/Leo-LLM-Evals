import { NextResponse } from 'next/server'
import { clearProvider } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
	await clearProvider('microsoft')
	const url = new URL(request.url)
	return NextResponse.redirect(new URL('/connections?disconnected=microsoft', url.origin), {
		status: 303,
	})
}
