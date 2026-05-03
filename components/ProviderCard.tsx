'use client'

import { useState } from 'react'
import { ConnectionInfoModal, type Provider } from './ConnectionInfoModal'

export type ProviderCardProps = {
	provider: Provider
	label: string
	description: string
	configured: boolean
	accountEmail: string | undefined
	connected: boolean
}

export function ProviderCard(props: ProviderCardProps) {
	const [open, setOpen] = useState(false)
	return (
		<section className='rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-sm'>
			<header className='mb-3 flex items-start justify-between gap-3'>
				<div>
					<div className='flex items-center gap-2'>
						<ProviderGlyph provider={props.provider} />
						<h2 className='font-semibold'>{props.label}</h2>
					</div>
					<p className='mt-1 text-sm text-muted-foreground'>{props.description}</p>
				</div>
				<StatusPill configured={props.configured} connected={props.connected} />
			</header>

			{!props.configured ? (
				<div className='space-y-2'>
					<button
						type='button'
						onClick={() => setOpen(true)}
						className='inline-flex items-center gap-2 rounded border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted'
					>
						<span>Learn how to enable</span>
						<svg width='12' height='12' viewBox='0 0 12 12' fill='none' aria-hidden='true'>
							<path d='M5 2l4 4-4 4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
						</svg>
					</button>
					<p className='text-xs text-muted-foreground'>
						This deployment doesn&apos;t have {props.label} OAuth credentials configured.
					</p>
				</div>
			) : props.connected ? (
				<div className='space-y-2'>
					<div className='text-sm text-muted-foreground'>
						{props.accountEmail ? (
							<>
								Signed in as <span className='font-mono text-foreground'>{props.accountEmail}</span>
							</>
						) : (
							'Connected'
						)}
					</div>
					<form action={`/api/auth/${props.provider}/disconnect`} method='post'>
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
					href={`/api/auth/${props.provider}`}
					className='inline-flex items-center gap-2 rounded border border-border bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90'
				>
					<span>Connect {props.label}</span>
				</a>
			)}

			<ConnectionInfoModal open={open} onClose={() => setOpen(false)} provider={props.provider} />
		</section>
	)
}

function StatusPill({ configured, connected }: { configured: boolean; connected: boolean }) {
	if (!configured) {
		return (
			<span className='rounded bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-300'>
				Not configured
			</span>
		)
	}
	if (connected) {
		return (
			<span className='rounded bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300'>
				Connected
			</span>
		)
	}
	return (
		<span className='rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'>
			Disconnected
		</span>
	)
}

function ProviderGlyph({ provider }: { provider: Provider }) {
	if (provider === 'google') {
		return (
			<svg width='18' height='18' viewBox='0 0 48 48' aria-hidden='true'>
				<path fill='#FFC107' d='M43.6 20.5H42V20H24v8h11.3a12 12 0 1 1-3.3-12.9l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5z' />
				<path fill='#FF3D00' d='M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7A20 20 0 0 0 6.3 14.7z' />
				<path fill='#4CAF50' d='M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z' />
				<path fill='#1976D2' d='M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C36.7 41 44 36 44 24c0-1.2-.1-2.4-.4-3.5z' />
			</svg>
		)
	}
	return (
		<svg width='18' height='18' viewBox='0 0 23 23' aria-hidden='true'>
			<rect x='1' y='1' width='10' height='10' fill='#F25022' />
			<rect x='12' y='1' width='10' height='10' fill='#7FBA00' />
			<rect x='1' y='12' width='10' height='10' fill='#00A4EF' />
			<rect x='12' y='12' width='10' height='10' fill='#FFB900' />
		</svg>
	)
}
