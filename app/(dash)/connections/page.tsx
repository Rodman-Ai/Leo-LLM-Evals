import { headers } from 'next/headers'
import { getSession } from '@/lib/auth/session'
import { readGoogleConfig } from '@/lib/auth/google'
import { readMicrosoftConfig } from '@/lib/auth/microsoft'
import { ProviderCard } from '@/components/ProviderCard'

export const dynamic = 'force-dynamic'

export const metadata = {
	title: 'Connections · evalbench',
	description: 'Connect Google or Microsoft to export evals to Sheets, OneDrive, or Excel.',
}

type SearchParams = Promise<{
	error?: string
	connected?: string
	disconnected?: string
}>

async function detectOrigin(): Promise<string> {
	const h = await headers()
	const proto = h.get('x-forwarded-proto') ?? 'http'
	const host = h.get('host') ?? 'localhost:3000'
	return `${proto}://${host}`
}

export default async function ConnectionsPage({ searchParams }: { searchParams: SearchParams }) {
	const sp = await searchParams
	const session = await getSession()
	const origin = await detectOrigin()

	const googleConfigured = readGoogleConfig(origin) !== null
	const microsoftConfigured = readMicrosoftConfig(origin) !== null

	return (
		<div className='space-y-6'>
			<header className='space-y-2'>
				<h1 className='text-3xl font-semibold tracking-tight'>Connections</h1>
				<p className='max-w-2xl text-muted-foreground'>
					Connect your Google or Microsoft account to export run results to Google Sheets or
					OneDrive. Tokens live only in an encrypted HttpOnly cookie scoped to this browser —
					they never touch the database.
				</p>
			</header>

			{sp.error && <FlashError message={mapErrorMessage(sp.error)} />}
			{sp.connected && <FlashSuccess message={`Connected ${sp.connected}.`} />}
			{sp.disconnected && <FlashSuccess message={`Disconnected ${sp.disconnected}.`} />}

			<div className='grid gap-4 md:grid-cols-2'>
				<ProviderCard
					provider='google'
					label='Google'
					description='Export runs as Google Sheets in your Drive.'
					configured={googleConfigured}
					accountEmail={session.google?.accountEmail}
					connected={Boolean(session.google)}
				/>
				<ProviderCard
					provider='microsoft'
					label='Microsoft'
					description='Upload run CSVs to OneDrive (opens natively in Excel).'
					configured={microsoftConfigured}
					accountEmail={session.microsoft?.accountEmail}
					connected={Boolean(session.microsoft)}
				/>
			</div>

			<details className='rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground'>
				<summary className='cursor-pointer text-sm font-medium text-foreground'>
					How OAuth credentials work in this deployment
				</summary>
				<div className='mt-3 space-y-2'>
					<p>
						Each provider needs <code>*_OAUTH_CLIENT_ID</code> and{' '}
						<code>*_OAUTH_CLIENT_SECRET</code> env vars in Vercel. Without them, the
						&ldquo;Connect&rdquo; button is replaced with a &ldquo;Learn how to enable&rdquo;
						button explaining what each integration would do.
					</p>
					<p>
						Tokens are encrypted with <code>SESSION_SECRET</code> via JWE-A256GCM and stored
						in an HttpOnly + Secure + SameSite=Lax cookie. Disconnecting clears the cookie.
					</p>
					<p>
						Full setup steps in{' '}
						<a
							href='https://github.com/Rodman-Ai/Leo-LLM-Evals/blob/main/docs/exports.md'
							className='underline'
						>
							docs/exports.md
						</a>
						.
					</p>
				</div>
			</details>
		</div>
	)
}

function FlashError({ message }: { message: string }) {
	return (
		<div className='rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-700 dark:text-red-300'>
			{message}
		</div>
	)
}

function FlashSuccess({ message }: { message: string }) {
	return (
		<div className='rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-2.5 text-sm text-green-700 dark:text-green-300'>
			{message}
		</div>
	)
}

function mapErrorMessage(code: string): string {
	switch (code) {
		case 'google_not_configured':
			return 'Google OAuth is not configured on this deployment.'
		case 'microsoft_not_configured':
			return 'Microsoft OAuth is not configured on this deployment.'
		case 'missing_params':
			return 'OAuth callback was missing required parameters — try connecting again.'
		default:
			return decodeURIComponent(code)
	}
}
