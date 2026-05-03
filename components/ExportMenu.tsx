'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { ExportInfoModal, type ExportTargetKind, type ExportInfoReason } from './ExportInfoModal'

export type ExportMenuProps = {
	csvHref: string
	googleSheetsPath: string | null
	onedrivePath: string | null
	googleConfigured: boolean
	microsoftConfigured: boolean
	googleConnected: boolean
	microsoftConnected: boolean
}

type Status =
	| { kind: 'idle' }
	| { kind: 'loading'; target: ExportTargetKind }
	| { kind: 'success'; target: ExportTargetKind; url: string | null; name: string }
	| { kind: 'error'; target: ExportTargetKind; message: string }

export function ExportMenu(props: ExportMenuProps) {
	const [open, setOpen] = useState(false)
	const [modal, setModal] = useState<{ target: ExportTargetKind; reason: ExportInfoReason } | null>(
		null,
	)
	const [status, setStatus] = useState<Status>({ kind: 'idle' })
	const [, startTransition] = useTransition()
	const wrapRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open) return
		const onClick = (e: MouseEvent) => {
			if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
		}
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false)
		}
		document.addEventListener('mousedown', onClick)
		document.addEventListener('keydown', onKey)
		return () => {
			document.removeEventListener('mousedown', onClick)
			document.removeEventListener('keydown', onKey)
		}
	}, [open])

	function clickTarget(target: ExportTargetKind) {
		setOpen(false)
		const isConfigured = target === 'sheets' ? props.googleConfigured : props.microsoftConfigured
		const isConnected = target === 'sheets' ? props.googleConnected : props.microsoftConnected
		if (!isConfigured) {
			setModal({ target, reason: 'not-configured' })
			return
		}
		if (!isConnected) {
			setModal({ target, reason: 'not-connected' })
			return
		}
		send(target)
	}

	function send(target: ExportTargetKind) {
		const path = target === 'sheets' ? props.googleSheetsPath : props.onedrivePath
		if (!path) return
		setStatus({ kind: 'loading', target })
		startTransition(async () => {
			try {
				const res = await fetch(path, { method: 'POST' })
				if (!res.ok) {
					const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
					setStatus({
						kind: 'error',
						target,
						message: typeof body.error === 'string' ? body.error : 'Export failed',
					})
					return
				}
				const json = (await res.json()) as { name: string; webViewLink?: string; webUrl?: string }
				setStatus({
					kind: 'success',
					target,
					url: json.webViewLink ?? json.webUrl ?? null,
					name: json.name,
				})
			} catch (err) {
				setStatus({
					kind: 'error',
					target,
					message: err instanceof Error ? err.message : String(err),
				})
			}
		})
	}

	const sheetsState = stateFor(props.googleConfigured, props.googleConnected)
	const onedriveState = stateFor(props.microsoftConfigured, props.microsoftConnected)

	return (
		<div className='relative inline-block' ref={wrapRef}>
			<button
				type='button'
				onClick={() => setOpen((v) => !v)}
				className='inline-flex items-center gap-2 rounded border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted'
			>
				<DownloadIcon />
				Export
				<svg width='10' height='10' viewBox='0 0 10 10' fill='none' aria-hidden='true'>
					<path d='M2 4l3 3 3-3' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
				</svg>
			</button>

			{open && (
				<div className='absolute right-0 z-20 mt-1 w-80 overflow-hidden rounded-lg border border-border bg-card text-sm shadow-xl'>
					<a
						href={props.csvHref}
						className='flex items-start gap-3 px-3 py-2.5 hover:bg-muted'
						onClick={() => setOpen(false)}
					>
						<FileIcon />
						<div className='flex-1'>
							<div className='font-medium'>Download CSV</div>
							<div className='mt-0.5 text-xs text-muted-foreground'>
								RFC 4180. Opens anywhere — no account needed.
							</div>
						</div>
					</a>

					<MenuButton
						label='Export to Google Sheets'
						sub={subline(sheetsState, 'Creates a new sheet in your Drive.')}
						state={sheetsState}
						onClick={() => clickTarget('sheets')}
						icon={<GoogleIcon />}
					/>

					<MenuButton
						label='Upload CSV to OneDrive'
						sub={subline(onedriveState, 'Saves to /Evalbench/ in your OneDrive.')}
						state={onedriveState}
						onClick={() => clickTarget('onedrive')}
						icon={<MicrosoftIcon />}
					/>

					<a
						href='/connections'
						className='block border-t border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted'
						onClick={() => setOpen(false)}
					>
						Manage connections →
					</a>
				</div>
			)}

			{status.kind !== 'idle' && (
				<div className='absolute right-0 mt-2 max-w-md rounded border border-border bg-card p-2.5 text-xs shadow-md'>
					{status.kind === 'loading' && (
						<span className='text-muted-foreground'>
							Sending to {status.target === 'sheets' ? 'Google Sheets' : 'OneDrive'}…
						</span>
					)}
					{status.kind === 'success' && (
						<span className='text-green-700 dark:text-green-400'>
							✓ Created {status.name}{' '}
							{status.url && (
								<a
									href={status.url}
									target='_blank'
									rel='noopener'
									className='underline'
								>
									Open
								</a>
							)}
						</span>
					)}
					{status.kind === 'error' && (
						<span className='text-red-700 dark:text-red-400'>✗ {status.message}</span>
					)}
				</div>
			)}

			{modal && (
				<ExportInfoModal
					open={modal !== null}
					onClose={() => setModal(null)}
					target={modal.target}
					reason={modal.reason}
				/>
			)}
		</div>
	)
}

type ItemState = 'ready' | 'not-connected' | 'not-configured'

function stateFor(configured: boolean, connected: boolean): ItemState {
	if (!configured) return 'not-configured'
	if (!connected) return 'not-connected'
	return 'ready'
}

function subline(state: ItemState, defaultText: string): string {
	if (state === 'not-configured') return 'Not configured on this deployment — click for details.'
	if (state === 'not-connected') return 'Not connected — click for details.'
	return defaultText
}

function MenuButton({
	label,
	sub,
	state,
	onClick,
	icon,
}: {
	label: string
	sub: string
	state: ItemState
	onClick: () => void
	icon: React.ReactNode
}) {
	const isReady = state === 'ready'
	return (
		<button
			type='button'
			onClick={onClick}
			className='flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-muted'
		>
			<span>{icon}</span>
			<span className='flex-1'>
				<span className='flex items-center gap-2 font-medium'>
					{label}
					{!isReady && (
						<span className='rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-yellow-700 dark:text-yellow-300'>
							{state === 'not-configured' ? 'setup' : 'connect'}
						</span>
					)}
				</span>
				<span className='mt-0.5 block text-xs text-muted-foreground'>{sub}</span>
			</span>
		</button>
	)
}

function DownloadIcon() {
	return (
		<svg width='14' height='14' viewBox='0 0 14 14' fill='none' aria-hidden='true'>
			<path d='M7 1.5v8m-3-3l3 3 3-3M2 12.5h10' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
		</svg>
	)
}

function FileIcon() {
	return (
		<svg width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true' className='mt-0.5 text-muted-foreground'>
			<path d='M3 1.5h6l4 4V14a.5.5 0 01-.5.5h-9A.5.5 0 013 14V2a.5.5 0 010-.5z' stroke='currentColor' strokeWidth='1.2' />
			<path d='M9 1.5v4h4' stroke='currentColor' strokeWidth='1.2' />
		</svg>
	)
}

function GoogleIcon() {
	return (
		<svg width='16' height='16' viewBox='0 0 48 48' aria-hidden='true' className='mt-0.5'>
			<path fill='#FFC107' d='M43.6 20.5H42V20H24v8h11.3a12 12 0 1 1-3.3-12.9l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5z' />
			<path fill='#FF3D00' d='M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7A20 20 0 0 0 6.3 14.7z' />
			<path fill='#4CAF50' d='M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z' />
			<path fill='#1976D2' d='M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C36.7 41 44 36 44 24c0-1.2-.1-2.4-.4-3.5z' />
		</svg>
	)
}

function MicrosoftIcon() {
	return (
		<svg width='16' height='16' viewBox='0 0 23 23' aria-hidden='true' className='mt-0.5'>
			<rect x='1' y='1' width='10' height='10' fill='#F25022' />
			<rect x='12' y='1' width='10' height='10' fill='#7FBA00' />
			<rect x='1' y='12' width='10' height='10' fill='#00A4EF' />
			<rect x='12' y='12' width='10' height='10' fill='#FFB900' />
		</svg>
	)
}
