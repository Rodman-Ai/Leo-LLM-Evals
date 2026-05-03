'use client'

import { useState, useTransition } from 'react'

export type ExportTarget = {
	csvHref: string
	googleSheetsPath: string | null
	onedrivePath: string | null
}

export type ExportMenuProps = ExportTarget & {
	googleConnected: boolean
	microsoftConnected: boolean
}

type Status =
	| { kind: 'idle' }
	| { kind: 'loading'; target: 'sheets' | 'onedrive' }
	| { kind: 'success'; target: 'sheets' | 'onedrive'; url: string | null; name: string }
	| { kind: 'error'; target: 'sheets' | 'onedrive'; message: string }

export function ExportMenu(props: ExportMenuProps) {
	const [open, setOpen] = useState(false)
	const [status, setStatus] = useState<Status>({ kind: 'idle' })
	const [isPending, startTransition] = useTransition()

	function send(target: 'sheets' | 'onedrive') {
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

	return (
		<div className='relative inline-block'>
			<button
				type='button'
				onClick={() => setOpen((v) => !v)}
				className='rounded border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted'
			>
				Export ▾
			</button>
			{open && (
				<div className='absolute right-0 z-10 mt-1 w-72 rounded-lg border border-border bg-card p-2 text-sm shadow-lg'>
					<a
						href={props.csvHref}
						className='block rounded px-3 py-2 hover:bg-muted'
						onClick={() => setOpen(false)}
					>
						Download CSV
						<div className='text-xs text-muted-foreground'>RFC 4180; opens anywhere.</div>
					</a>

					<MenuButton
						label='Export to Google Sheets'
						sub={
							!props.googleSheetsPath
								? 'Not available'
								: props.googleConnected
									? 'Creates a new sheet in your Drive.'
									: 'Connect Google in /connections first.'
						}
						disabled={!props.googleSheetsPath || !props.googleConnected || isPending}
						onClick={() => {
							setOpen(false)
							send('sheets')
						}}
					/>

					<MenuButton
						label='Upload CSV to OneDrive'
						sub={
							!props.onedrivePath
								? 'Not available'
								: props.microsoftConnected
									? 'Saves to /Evalbench/ in your OneDrive.'
									: 'Connect Microsoft in /connections first.'
						}
						disabled={!props.onedrivePath || !props.microsoftConnected || isPending}
						onClick={() => {
							setOpen(false)
							send('onedrive')
						}}
					/>

					{!props.googleConnected || !props.microsoftConnected ? (
						<a
							href='/connections'
							className='block rounded px-3 py-2 text-xs text-muted-foreground hover:bg-muted'
							onClick={() => setOpen(false)}
						>
							Manage connections →
						</a>
					) : null}
				</div>
			)}

			{status.kind !== 'idle' && (
				<div className='mt-2 max-w-md rounded border border-border bg-card p-2 text-xs'>
					{status.kind === 'loading' && (
						<span>
							Sending to {status.target === 'sheets' ? 'Google Sheets' : 'OneDrive'}…
						</span>
					)}
					{status.kind === 'success' && (
						<span className='text-green-700 dark:text-green-400'>
							✓ {status.name}{' '}
							{status.url && (
								<a href={status.url} target='_blank' rel='noopener' className='underline'>
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
		</div>
	)
}

function MenuButton({
	label,
	sub,
	disabled,
	onClick,
}: {
	label: string
	sub: string
	disabled: boolean
	onClick: () => void
}) {
	return (
		<button
			type='button'
			disabled={disabled}
			onClick={onClick}
			className='block w-full rounded px-3 py-2 text-left hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent'
		>
			{label}
			<div className='text-xs text-muted-foreground'>{sub}</div>
		</button>
	)
}
