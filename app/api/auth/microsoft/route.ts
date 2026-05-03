import { NextResponse } from 'next/server'
import { buildAuthorizationUrl, MicrosoftNotConfiguredError } from '@/lib/auth/microsoft'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
	const url = new URL(request.url)
	const redirectTo = url.searchParams.get('redirect_to') ?? undefined
	try {
		const authorizeUrl = await buildAuthorizationUrl(url.origin, redirectTo)
		return NextResponse.redirect(authorizeUrl)
	} catch (err) {
		if (err instanceof MicrosoftNotConfiguredError) {
			return NextResponse.redirect(
				new URL('/connections?error=microsoft_not_configured', url.origin),
			)
		}
		throw err
	}
}
