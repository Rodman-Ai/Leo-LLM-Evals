import { getProviderTokens, isExpired, setProviderTokens, type TokenSet } from '@/lib/auth/session'
import { refreshAccessToken } from '@/lib/auth/google'

export type GoogleUploadResult = {
	id: string
	name: string
	webViewLink: string | null
}

async function getValidToken(origin: string): Promise<TokenSet | null> {
	const tokens = await getProviderTokens('google')
	if (!tokens) return null
	if (!isExpired(tokens)) return tokens
	if (!tokens.refreshToken) return null
	const refreshed = await refreshAccessToken(origin, tokens.refreshToken)
	if (!refreshed) return null
	const merged: TokenSet = { ...tokens, ...refreshed }
	await setProviderTokens('google', merged)
	return merged
}

/**
 * Uploads `csv` to Drive with `mimeType: application/vnd.google-apps.spreadsheet`,
 * which auto-converts to a Google Sheet. Returns the file id + a web view link
 * the user can click to open the new sheet.
 *
 * Uses the multipart upload variant so the metadata (filename) and content
 * land in a single request.
 */
export async function uploadCsvAsSheet(opts: {
	origin: string
	csv: string
	title: string
}): Promise<{ ok: true; result: GoogleUploadResult } | { ok: false; error: string; status?: number }> {
	const tokens = await getValidToken(opts.origin)
	if (!tokens) return { ok: false, error: 'not connected' }

	const boundary = `evb${Math.random().toString(36).slice(2)}`
	const metadata = {
		name: opts.title,
		mimeType: 'application/vnd.google-apps.spreadsheet',
	}
	const body =
		`--${boundary}\r\n` +
		`Content-Type: application/json; charset=UTF-8\r\n\r\n` +
		`${JSON.stringify(metadata)}\r\n` +
		`--${boundary}\r\n` +
		`Content-Type: text/csv; charset=UTF-8\r\n\r\n` +
		`${opts.csv}\r\n` +
		`--${boundary}--`

	const res = await fetch(
		'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
		{
			method: 'POST',
			headers: {
				authorization: `Bearer ${tokens.accessToken}`,
				'content-type': `multipart/related; boundary=${boundary}`,
			},
			body,
		},
	)
	if (!res.ok) {
		const text = await res.text().catch(() => '')
		return { ok: false, status: res.status, error: text.slice(0, 500) || `HTTP ${res.status}` }
	}
	const json = (await res.json()) as { id: string; name: string; webViewLink?: string }
	return {
		ok: true,
		result: { id: json.id, name: json.name, webViewLink: json.webViewLink ?? null },
	}
}
