'use client'

import { Modal } from './Modal'

export type ExportTargetKind = 'sheets' | 'onedrive'

const INFO: Record<
	ExportTargetKind,
	{
		title: string
		provider: 'Google' | 'Microsoft'
		whereItGoes: string
		bullets: string[]
		connectHref: string
		notConfiguredEnv: string[]
	}
> = {
	sheets: {
		title: 'Export to Google Sheets',
		provider: 'Google',
		whereItGoes: 'A new spreadsheet appears in your Drive root, named after the run or leaderboard.',
		bullets: [
			'CSV is uploaded with mime type application/vnd.google-apps.spreadsheet — Drive auto-converts to a real Sheet.',
			'Includes per-case input/expected/output, score JSON, cost, latency, and tokens.',
			'You stay the owner of the file; evalbench uses the drive.file scope and can only see what it created.',
		],
		connectHref: '/connections',
		notConfiguredEnv: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'],
	},
	onedrive: {
		title: 'Upload CSV to OneDrive',
		provider: 'Microsoft',
		whereItGoes: 'A CSV lands at /Evalbench/<filename>.csv in your OneDrive.',
		bullets: [
			'Excel, Numbers, Sheets — all open CSV natively. No xlsx conversion needed.',
			'Same per-case columns as the Google Sheets export.',
			'Uses the Microsoft Graph Files.ReadWrite scope; nothing else in your account is touched.',
		],
		connectHref: '/connections',
		notConfiguredEnv: ['MICROSOFT_OAUTH_CLIENT_ID', 'MICROSOFT_OAUTH_CLIENT_SECRET'],
	},
}

export type ExportInfoReason = 'not-configured' | 'not-connected'

export function ExportInfoModal({
	open,
	onClose,
	target,
	reason,
}: {
	open: boolean
	onClose: () => void
	target: ExportTargetKind
	reason: ExportInfoReason
}) {
	const info = INFO[target]
	return (
		<Modal open={open} onClose={onClose} title={info.title}>
			<div className='space-y-5 text-sm'>
				<section>
					<h3 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
						What this would do
					</h3>
					<p className='mt-2'>{info.whereItGoes}</p>
					<ul className='mt-3 space-y-1.5'>
						{info.bullets.map((b) => (
							<li key={b} className='flex gap-2'>
								<span className='text-muted-foreground'>·</span>
								<span>{b}</span>
							</li>
						))}
					</ul>
				</section>

				{reason === 'not-connected' ? (
					<section className='rounded-lg border border-blue-500/30 bg-blue-500/5 p-4'>
						<h3 className='text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300'>
							Not connected yet
						</h3>
						<p className='mt-1 text-xs text-muted-foreground'>
							Connect your {info.provider} account once and exports stay enabled for this
							browser (cookie-scoped, 30-day max age, encrypted).
						</p>
					</section>
				) : (
					<section className='rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4'>
						<h3 className='text-xs font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-300'>
							Not configured on this deployment
						</h3>
						<p className='mt-1 text-xs text-muted-foreground'>
							The deploy operator hasn&apos;t set up {info.provider} OAuth yet. Required env
							vars:
						</p>
						<ul className='mt-2 space-y-1 font-mono text-xs'>
							{info.notConfiguredEnv.map((v) => (
								<li key={v}>{v}</li>
							))}
						</ul>
					</section>
				)}

				<div className='flex items-center justify-between gap-3 border-t border-border pt-4'>
					<a
						href='https://github.com/Rodman-Ai/Leo-LLM-Evals/blob/main/docs/exports.md'
						target='_blank'
						rel='noopener'
						className='text-xs text-muted-foreground underline hover:text-foreground'
					>
						Read the full setup guide →
					</a>
					<div className='flex gap-2'>
						<button
							type='button'
							onClick={onClose}
							className='rounded border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted'
						>
							Close
						</button>
						{reason === 'not-connected' && (
							<a
								href={info.connectHref}
								className='rounded border border-border bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90'
							>
								Open Connections
							</a>
						)}
					</div>
				</div>
			</div>
		</Modal>
	)
}
