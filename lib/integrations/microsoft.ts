import { getProviderTokens, isExpired, setProviderTokens, type TokenSet } from '@/lib/auth/session'
import { refreshAccessToken } from '@/lib/auth/microsoft'

export type OneDriveUploadResult = {
	id: string
	name: string
	webUrl: string | null
}

async function getValidToken(origin: string): Promise<TokenSet | null> {
	const tokens = await getProviderTokens('microsoft')
	if (!tokens) return null
	if (!isExpired(tokens)) return tokens
	if (!tokens.refreshToken) return null
	const refreshed = await refreshAccessToken(origin, tokens.refreshToken)
	if (!refreshed) return null
	const merged: TokenSet = { ...tokens, ...refreshed }
	await setProviderTokens('microsoft', merged)
	return merged
}

/**
 * Uploads `csv` to the user's OneDrive at `/Evalbench/<filename>`. CSV opens
 * natively in Excel — no .xlsx conversion needed for v1 (deferred per the
 * shipped scope). Uses simple PUT for files <4MB, which our run/leaderboard
 * exports always are.
 */
export async function uploadCsvToOneDrive(opts: {
	origin: string
	csv: string
	filename: string
}): Promise<{ ok: true; result: OneDriveUploadResult } | { ok: false; error: string; status?: number }> {
	const tokens = await getValidToken(opts.origin)
	if (!tokens) return { ok: false, error: 'not connected' }

	const path = `Evalbench/${opts.filename}`
	const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(path)}:/content?@microsoft.graph.conflictBehavior=rename`

	const res = await fetch(url, {
		method: 'PUT',
		headers: {
			authorization: `Bearer ${tokens.accessToken}`,
			'content-type': 'text/csv; charset=utf-8',
		},
		body: opts.csv,
	})
	if (!res.ok) {
		const text = await res.text().catch(() => '')
		return { ok: false, status: res.status, error: text.slice(0, 500) || `HTTP ${res.status}` }
	}
	const json = (await res.json()) as { id: string; name: string; webUrl?: string }
	return {
		ok: true,
		result: { id: json.id, name: json.name, webUrl: json.webUrl ?? null },
	}
}
