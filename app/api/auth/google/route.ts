import { NextResponse } from 'next/server'
import { buildAuthorizationUrl, GoogleNotConfiguredError } from '@/lib/auth/google'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
	const url = new URL(request.url)
	const redirectTo = url.searchParams.get('redirect_to') ?? undefined
	try {
		const authorizeUrl = await buildAuthorizationUrl(url.origin, redirectTo)
		return NextResponse.redirect(authorizeUrl)
	} catch (err) {
		if (err instanceof GoogleNotConfiguredError) {
			const fallback = new URL('/connections?error=google_not_configured', url.origin)
			return NextResponse.redirect(fallback)
		}
		throw err
	}
}
