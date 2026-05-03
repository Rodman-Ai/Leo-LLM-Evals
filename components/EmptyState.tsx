import type { ReactNode } from 'react'

export function EmptyState({
	title,
	description,
	action,
}: {
	title: string
	description?: ReactNode
	action?: ReactNode
}) {
	return (
		<div className='rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center'>
			<div className='mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground'>
				<svg width='18' height='18' viewBox='0 0 18 18' fill='none' aria-hidden='true'>
					<path
						d='M3 6h12M3 9h12M3 12h7'
						stroke='currentColor'
						strokeWidth='1.5'
						strokeLinecap='round'
					/>
				</svg>
			</div>
			<h2 className='mt-4 font-medium'>{title}</h2>
			{description && (
				<p className='mx-auto mt-2 max-w-md text-sm text-muted-foreground'>{description}</p>
			)}
			{action && <div className='mt-4 flex justify-center'>{action}</div>}
		</div>
	)
}

export function ErrorBlock({ message }: { message: string }) {
	return (
		<div className='rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-300'>
			<div className='font-medium'>Database error</div>
			<div className='mt-1 font-mono text-xs opacity-80'>{message}</div>
		</div>
	)
}
