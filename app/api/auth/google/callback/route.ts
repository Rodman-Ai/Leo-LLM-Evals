import { NextResponse } from 'next/server'
import { handleCallback } from '@/lib/auth/google'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
	const url = new URL(request.url)
	const code = url.searchParams.get('code')
	const state = url.searchParams.get('state')
	const errorParam = url.searchParams.get('error')

	if (errorParam) {
		return NextResponse.redirect(
			new URL(`/connections?error=${encodeURIComponent(errorParam)}`, url.origin),
		)
	}
	if (!code || !state) {
		return NextResponse.redirect(new URL('/connections?error=missing_params', url.origin))
	}

	const result = await handleCallback(url.origin, code, state)
	if (!result.ok) {
		return NextResponse.redirect(
			new URL(`/connections?error=${encodeURIComponent(result.error)}`, url.origin),
		)
	}
	const target = result.redirectTo.startsWith('/') ? result.redirectTo : '/connections'
	return NextResponse.redirect(new URL(`${target}?connected=google`, url.origin))
}
