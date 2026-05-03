import { cookies } from 'next/headers'
import { encryptValue, decryptValue } from './crypto'

/**
 * Per-visitor session held in an HttpOnly + Secure + SameSite=Lax cookie,
 * encrypted with `SESSION_SECRET` via JWE (A256GCM). Two slots: one for
 * Google, one for Microsoft. Tokens never touch the database.
 *
 * Sessions are not "users" — there's no identity on the server. The
 * cookie is the only thing tying a browser to its OAuth tokens. Clearing
 * cookies disconnects.
 */

const SESSION_COOKIE = 'evalbench_session'
const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30 // 30 days

export type Provider = 'google' | 'microsoft'

export type TokenSet = {
	accessToken: string
	refreshToken?: string
	expiresAt: number // ms epoch
	scope?: string
	accountEmail?: string
}

export type Session = {
	google?: TokenSet
	microsoft?: TokenSet
}

export type OAuthState = {
	state: string
	codeVerifier?: string
	provider: Provider
	redirectTo?: string
}

const STATE_COOKIE_PREFIX = 'evalbench_oauth_'
const STATE_MAX_AGE_S = 60 * 10 // 10 minutes — auth code flow timeout

export async function getSession(): Promise<Session> {
	const jar = await cookies()
	const raw = jar.get(SESSION_COOKIE)?.value
	if (!raw) return {}
	return (await decryptValue<Session>(raw)) ?? {}
}

async function writeSession(session: Session): Promise<void> {
	const jar = await cookies()
	if (!session.google && !session.microsoft) {
		jar.delete(SESSION_COOKIE)
		return
	}
	const value = await encryptValue(session)
	jar.set(SESSION_COOKIE, value, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: SESSION_MAX_AGE_S,
	})
}

export async function setProviderTokens(provider: Provider, tokens: TokenSet): Promise<void> {
	const session = await getSession()
	session[provider] = tokens
	await writeSession(session)
}

export async function clearProvider(provider: Provider): Promise<void> {
	const session = await getSession()
	delete session[provider]
	await writeSession(session)
}

export async function getProviderTokens(provider: Provider): Promise<TokenSet | null> {
	const session = await getSession()
	return session[provider] ?? null
}

export function isExpired(token: TokenSet, skewMs = 30_000): boolean {
	return Date.now() > token.expiresAt - skewMs
}

export async function setOAuthState(payload: OAuthState): Promise<void> {
	const jar = await cookies()
	const value = await encryptValue(payload)
	jar.set(`${STATE_COOKIE_PREFIX}${payload.provider}`, value, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: STATE_MAX_AGE_S,
	})
}

export async function consumeOAuthState(provider: Provider): Promise<OAuthState | null> {
	const jar = await cookies()
	const cookieName = `${STATE_COOKIE_PREFIX}${provider}`
	const raw = jar.get(cookieName)?.value
	if (!raw) return null
	jar.delete(cookieName)
	return decryptValue<OAuthState>(raw)
}
