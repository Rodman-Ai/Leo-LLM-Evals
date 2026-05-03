import Link from 'next/link'
import type { ReactNode } from 'react'

export type Crumb = { label: string; href?: string }

export function PageHeader({
	title,
	description,
	crumbs,
	actions,
}: {
	title: string
	description?: ReactNode
	crumbs?: Crumb[]
	actions?: ReactNode
}) {
	return (
		<header className='space-y-2'>
			{crumbs && crumbs.length > 0 && (
				<nav className='flex items-center gap-1 text-xs text-muted-foreground'>
					{crumbs.map((c, i) => (
						<span key={`${c.label}-${i}`} className='flex items-center gap-1'>
							{i > 0 && <span>/</span>}
							{c.href ? (
								<Link href={c.href} className='hover:text-foreground hover:underline'>
									{c.label}
								</Link>
							) : (
								<span>{c.label}</span>
							)}
						</span>
					))}
				</nav>
			)}
			<div className='flex flex-wrap items-end justify-between gap-3'>
				<div className='space-y-1'>
					<h1 className='text-2xl font-semibold tracking-tight sm:text-3xl'>{title}</h1>
					{description && (
						<p className='max-w-2xl text-sm text-muted-foreground'>{description}</p>
					)}
				</div>
				{actions && <div className='flex items-center gap-2'>{actions}</div>}
			</div>
		</header>
	)
}
