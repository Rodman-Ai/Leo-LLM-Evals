import { getSession } from '@/lib/auth/session'
import { readGoogleConfig } from '@/lib/auth/google'
import { readMicrosoftConfig } from '@/lib/auth/microsoft'
import { headers } from 'next/headers'

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
				<p className='text-muted-foreground'>
					Connect your Google or Microsoft account to export run results to Google Sheets or
					OneDrive (CSV opens natively in Excel). Tokens live in an HttpOnly cookie scoped to
					this browser — disconnect by clearing cookies or using the disconnect button.
				</p>
			</header>

			{sp.error && <FlashError message={mapErrorMessage(sp.error)} />}
			{sp.connected && <FlashInfo message={`Connected ${sp.connected}.`} />}
			{sp.disconnected && <FlashInfo message={`Disconnected ${sp.disconnected}.`} />}

			<div className='grid gap-4 md:grid-cols-2'>
				<ProviderCard
					provider='google'
					label='Google'
					description='Export runs to Google Sheets in your Drive. Requested scope is drive.file (only files this app creates).'
					configured={googleConfigured}
					accountEmail={session.google?.accountEmail}
					connectedAt={session.google ? Math.min(session.google.expiresAt, Date.now()) : null}
				/>
				<ProviderCard
					provider='microsoft'
					label='Microsoft'
					description='Upload run CSVs to OneDrive at /Evalbench/. CSV opens natively in Excel.'
					configured={microsoftConfigured}
					accountEmail={session.microsoft?.accountEmail}
					connectedAt={session.microsoft ? Math.min(session.microsoft.expiresAt, Date.now()) : null}
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
						&ldquo;Connect&rdquo; button shows a <em>not configured</em> state. See{' '}
						<a href='https://github.com/Rodman-Ai/Leo-LLM-Evals/blob/main/docs/exports.md' className='underline'>
							docs/exports.md
						</a>{' '}
						for setup instructions.
					</p>
					<p>
						Tokens are encrypted with <code>SESSION_SECRET</code> via JWE-A256GCM and stored
						in an HttpOnly + Secure + SameSite=Lax cookie. They never touch the database.
					</p>
				</div>
			</details>
		</div>
	)
}

function ProviderCard({
	provider,
	label,
	description,
	configured,
	accountEmail,
	connectedAt,
}: {
	provider: 'google' | 'microsoft'
	label: string
	description: string
	configured: boolean
	accountEmail: string | undefined
	connectedAt: number | null
}) {
	const isConnected = Boolean(accountEmail || connectedAt)
	return (
		<section className='rounded-lg border border-border bg-card p-5'>
			<header className='mb-3'>
				<h2 className='font-semibold'>{label}</h2>
				<p className='mt-1 text-sm text-muted-foreground'>{description}</p>
			</header>

			{!configured ? (
				<div className='space-y-2'>
					<div className='inline-flex rounded bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-700 dark:text-yellow-300'>
						Not configured on this deployment
					</div>
					<button
						type='button'
						disabled
						className='block rounded border border-border bg-background px-3 py-1.5 text-sm font-medium opacity-50'
					>
						Connect {label} (demo)
					</button>
					<p className='text-xs text-muted-foreground'>
						Set <code>{provider.toUpperCase()}_OAUTH_CLIENT_ID</code> and{' '}
						<code>{provider.toUpperCase()}_OAUTH_CLIENT_SECRET</code> in Vercel env vars to
						enable.
					</p>
				</div>
			) : isConnected ? (
				<div className='space-y-2'>
					<div className='inline-flex rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-300'>
						Connected{accountEmail ? ` as ${accountEmail}` : ''}
					</div>
					<form action={`/api/auth/${provider}/disconnect`} method='post'>
						<button
							type='submit'
							className='rounded border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted'
						>
							Disconnect
						</button>
					</form>
				</div>
			) : (
				<a
					href={`/api/auth/${provider}`}
					className='inline-block rounded border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted'
				>
					Connect {label}
				</a>
			)}
		</section>
	)
}

function FlashError({ message }: { message: string }) {
	return (
		<div className='rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-300'>
			{message}
		</div>
	)
}

function FlashInfo({ message }: { message: string }) {
	return (
		<div className='rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm text-green-700 dark:text-green-300'>
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
