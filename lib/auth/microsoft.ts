import {
	MicrosoftEntraId,
	generateState,
	generateCodeVerifier,
	type OAuth2Tokens,
} from 'arctic'
import { setProviderTokens, setOAuthState, consumeOAuthState, type TokenSet } from './session'

export const MICROSOFT_SCOPES = [
	'openid',
	'email',
	'profile',
	'offline_access',
	'Files.ReadWrite',
	'User.Read',
] as const

export type MicrosoftConfig = {
	clientId: string
	clientSecret: string
	tenant: string
	redirectUri: string
}

export class MicrosoftNotConfiguredError extends Error {
	code = 'microsoft_not_configured' as const
	constructor() {
		super(
			'Microsoft OAuth is not configured. Set MICROSOFT_OAUTH_CLIENT_ID and MICROSOFT_OAUTH_CLIENT_SECRET (and optionally MICROSOFT_OAUTH_TENANT, default "common").',
		)
	}
}

export function readMicrosoftConfig(origin: string): MicrosoftConfig | null {
	const clientId = process.env.MICROSOFT_OAUTH_CLIENT_ID
	const clientSecret = process.env.MICROSOFT_OAUTH_CLIENT_SECRET
	if (!clientId || !clientSecret) return null
	const tenant = process.env.MICROSOFT_OAUTH_TENANT ?? 'common'
	return {
		clientId,
		clientSecret,
		tenant,
		redirectUri: `${origin}/api/auth/microsoft/callback`,
	}
}

function buildClient(config: MicrosoftConfig): MicrosoftEntraId {
	return new MicrosoftEntraId(config.tenant, config.clientId, config.clientSecret, config.redirectUri)
}

export async function buildAuthorizationUrl(origin: string, redirectTo?: string): Promise<URL> {
	const config = readMicrosoftConfig(origin)
	if (!config) throw new MicrosoftNotConfiguredError()
	const client = buildClient(config)
	const state = generateState()
	const codeVerifier = generateCodeVerifier()
	await setOAuthState({ state, codeVerifier, provider: 'microsoft', redirectTo })
	return client.createAuthorizationURL(state, codeVerifier, [...MICROSOFT_SCOPES])
}

export type CallbackResult =
	| { ok: true; redirectTo: string }
	| { ok: false; error: string }

export async function handleCallback(origin: string, code: string, state: string): Promise<CallbackResult> {
	const config = readMicrosoftConfig(origin)
	if (!config) return { ok: false, error: 'microsoft not configured' }

	const stored = await consumeOAuthState('microsoft')
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
	const accountEmail = await fetchAccountEmail(accessToken)

	const tokenSet: TokenSet = {
		accessToken,
		refreshToken,
		expiresAt,
		scope: MICROSOFT_SCOPES.join(' '),
		accountEmail,
	}
	await setProviderTokens('microsoft', tokenSet)
	return { ok: true, redirectTo: stored.redirectTo ?? '/connections' }
}

export async function refreshAccessToken(origin: string, refreshToken: string): Promise<TokenSet | null> {
	const config = readMicrosoftConfig(origin)
	if (!config) return null
	const client = buildClient(config)
	try {
		const tokens = await client.refreshAccessToken(refreshToken, [...MICROSOFT_SCOPES])
		return {
			accessToken: tokens.accessToken(),
			refreshToken: safeRefreshToken(tokens) ?? refreshToken,
			expiresAt: safeExpiresAt(tokens),
		}
	} catch {
		return null
	}
}

async function fetchAccountEmail(accessToken: string): Promise<string | undefined> {
	try {
		const res = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
			headers: { authorization: `Bearer ${accessToken}` },
		})
		if (!res.ok) return undefined
		const json = (await res.json()) as { mail?: string; userPrincipalName?: string }
		return json.mail ?? json.userPrincipalName
	} catch {
		return undefined
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
		return Date.now() + 3_500_000
	}
}
