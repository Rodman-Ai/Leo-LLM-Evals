'use client'

import { Modal } from './Modal'

export type Provider = 'google' | 'microsoft'

const PROVIDER_INFO: Record<
	Provider,
	{
		title: string
		whatItDoes: string[]
		scopes: { name: string; explanation: string }[]
		envVars: string[]
		setupSummary: string[]
		docsAnchor: string
	}
> = {
	google: {
		title: 'Connect Google',
		whatItDoes: [
			'Adds an "Export to Google Sheets" option in the run + leaderboard menus.',
			'Each export creates a new spreadsheet in your Drive root with the run\'s per-case data.',
			'Auto-converts CSV to a real Google Sheet on upload — formulas, filters, sharing all work.',
		],
		scopes: [
			{
				name: 'openid · email',
				explanation: 'Used only to display the connected account in /connections.',
			},
			{
				name: 'drive.file',
				explanation:
					'Minimum-privilege scope. evalbench can only see/edit files it has created — not any existing Drive content.',
			},
		],
		envVars: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'SESSION_SECRET'],
		setupSummary: [
			'console.cloud.google.com → create a project, enable the Drive API.',
			'OAuth consent screen (External) with scopes openid, email, drive.file.',
			'Credentials → OAuth Client ID (Web), redirect URI /api/auth/google/callback.',
			'Paste client id + secret into Vercel env vars; redeploy.',
		],
		docsAnchor: '/docs/exports.md#setup--google',
	},
	microsoft: {
		title: 'Connect Microsoft',
		whatItDoes: [
			'Adds an "Upload CSV to OneDrive" option in the run + leaderboard menus.',
			'Each export saves a CSV at /Evalbench/<filename>.csv in your OneDrive.',
			'CSV opens natively in Excel — no .xlsx conversion needed.',
		],
		scopes: [
			{
				name: 'User.Read',
				explanation: 'Used only to display your account email in /connections.',
			},
			{
				name: 'Files.ReadWrite',
				explanation: 'Lets evalbench write files to your OneDrive.',
			},
			{
				name: 'offline_access',
				explanation: 'Issues a refresh token so the connection survives access-token expiry.',
			},
		],
		envVars: ['MICROSOFT_OAUTH_CLIENT_ID', 'MICROSOFT_OAUTH_CLIENT_SECRET', 'SESSION_SECRET'],
		setupSummary: [
			'entra.microsoft.com → App registrations → New registration ("any directory + personal accounts").',
			'Redirect URI /api/auth/microsoft/callback.',
			'API permissions: Files.ReadWrite, User.Read, offline_access.',
			'Certificates & secrets → New client secret. Paste into Vercel env vars; redeploy.',
		],
		docsAnchor: '/docs/exports.md#setup--microsoft',
	},
}

export function ConnectionInfoModal({
	open,
	onClose,
	provider,
}: {
	open: boolean
	onClose: () => void
	provider: Provider
}) {
	const info = PROVIDER_INFO[provider]
	return (
		<Modal open={open} onClose={onClose} title={info.title}>
			<div className='space-y-5 text-sm'>
				<section>
					<h3 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
						What this would do
					</h3>
					<ul className='mt-2 space-y-1.5 text-foreground'>
						{info.whatItDoes.map((line) => (
							<li key={line} className='flex gap-2'>
								<span className='text-muted-foreground'>·</span>
								<span>{line}</span>
							</li>
						))}
					</ul>
				</section>

				<section>
					<h3 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
						Permissions requested
					</h3>
					<ul className='mt-2 space-y-2'>
						{info.scopes.map((s) => (
							<li key={s.name} className='rounded border border-border bg-muted/30 p-2.5'>
								<div className='font-mono text-xs'>{s.name}</div>
								<div className='mt-1 text-xs text-muted-foreground'>{s.explanation}</div>
							</li>
						))}
					</ul>
				</section>

				<section className='rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4'>
					<h3 className='text-xs font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-300'>
						Not configured on this deployment
					</h3>
					<p className='mt-1 text-xs text-muted-foreground'>
						To enable, set these env vars in Vercel and redeploy:
					</p>
					<ul className='mt-2 space-y-1 font-mono text-xs'>
						{info.envVars.map((v) => (
							<li key={v}>{v}</li>
						))}
					</ul>
					<details className='mt-3 text-xs'>
						<summary className='cursor-pointer text-muted-foreground hover:text-foreground'>
							Quick setup steps
						</summary>
						<ol className='mt-2 space-y-1.5 pl-4 text-muted-foreground [counter-reset:item] list-decimal'>
							{info.setupSummary.map((step) => (
								<li key={step}>{step}</li>
							))}
						</ol>
					</details>
				</section>

				<div className='flex items-center justify-between gap-3 border-t border-border pt-4'>
					<a
						href={`https://github.com/Rodman-Ai/Leo-LLM-Evals/blob/main${info.docsAnchor}`}
						target='_blank'
						rel='noopener'
						className='text-xs text-muted-foreground underline hover:text-foreground'
					>
						Read the full setup guide →
					</a>
					<button
						type='button'
						onClick={onClose}
						className='rounded border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted'
					>
						Got it
					</button>
				</div>
			</div>
		</Modal>
	)
}
