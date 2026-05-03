import { Google, generateState, generateCodeVerifier, decodeIdToken, type OAuth2Tokens } from 'arctic'
import { setProviderTokens, setOAuthState, consumeOAuthState, type TokenSet } from './session'

export const GOOGLE_SCOPES = [
	'openid',
	'email',
	'https://www.googleapis.com/auth/drive.file',
] as const

export type GoogleConfig = {
	clientId: string
	clientSecret: string
	redirectUri: string
}

export class GoogleNotConfiguredError extends Error {
	code = 'google_not_configured' as const
	constructor() {
		super('Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.')
	}
}

export function readGoogleConfig(origin: string): GoogleConfig | null {
	const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
	const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
	if (!clientId || !clientSecret) return null
	const redirectUri = `${origin}/api/auth/google/callback`
	return { clientId, clientSecret, redirectUri }
}

function buildClient(config: GoogleConfig): Google {
	return new Google(config.clientId, config.clientSecret, config.redirectUri)
}

export async function buildAuthorizationUrl(origin: string, redirectTo?: string): Promise<URL> {
	const config = readGoogleConfig(origin)
	if (!config) throw new GoogleNotConfiguredError()
	const client = buildClient(config)
	const state = generateState()
	const codeVerifier = generateCodeVerifier()
	await setOAuthState({ state, codeVerifier, provider: 'google', redirectTo })
	const url = client.createAuthorizationURL(state, codeVerifier, [...GOOGLE_SCOPES])
	url.searchParams.set('access_type', 'offline')
	url.searchParams.set('prompt', 'consent') // force refresh-token issuance
	return url
}

export type CallbackResult =
	| { ok: true; redirectTo: string }
	| { ok: false; error: string }

export async function handleCallback(origin: string, code: string, state: string): Promise<CallbackResult> {
	const config = readGoogleConfig(origin)
	if (!config) return { ok: false, error: 'google not configured' }

	const stored = await consumeOAuthState('google')
	if (!stored) return { ok: false, error: 'oauth state cookie missing or expired — restart the flow' }
	if (stored.state !== state) return { ok: false, error: 'oauth state mismatch' }
	if (!stored.codeVerifier) return { ok: false, error: 'missing pkce verifier' }

	const client = buildClient(config)
	let tokens: OAuth2Tokens
	try {
		tokens = await client.validateAuthorizationCode(code, stored.codeVerifier)
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : String(err) }
	}

	const accessToken = tokens.accessToken()
	const refreshToken = safeRefreshToken(tokens)
	const expiresAt = safeExpiresAt(tokens)
	const accountEmail = readEmailFromIdToken(tokens)

	const tokenSet: TokenSet = {
		accessToken,
		refreshToken,
		expiresAt,
		scope: GOOGLE_SCOPES.join(' '),
		accountEmail,
	}
	await setProviderTokens('google', tokenSet)
	return { ok: true, redirectTo: stored.redirectTo ?? '/connections' }
}

export async function refreshAccessToken(origin: string, refreshToken: string): Promise<TokenSet | null> {
	const config = readGoogleConfig(origin)
	if (!config) return null
	const client = buildClient(config)
	try {
		const tokens = await client.refreshAccessToken(refreshToken)
		return {
			accessToken: tokens.accessToken(),
			refreshToken: safeRefreshToken(tokens) ?? refreshToken,
			expiresAt: safeExpiresAt(tokens),
		}
	} catch {
		return null
	}
}

function safeRefreshToken(tokens: OAuth2Tokens): string | undefined {
	try {
		return tokens.refreshToken()
	} catch {
		return undefined
	}
}

function safeExpiresAt(tokens: OAuth2Tokens): number {
	try {
		return tokens.accessTokenExpiresAt().getTime()
	} catch {
		return Date.now() + 3_500_000 // ~58 min default
	}
}

function readEmailFromIdToken(tokens: OAuth2Tokens): string | undefined {
	try {
		const idToken = tokens.idToken()
		const claims = decodeIdToken(idToken) as { email?: string }
		return claims.email
	} catch {
		return undefined
	}
}
