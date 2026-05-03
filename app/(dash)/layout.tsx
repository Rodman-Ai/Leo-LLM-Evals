import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function DashLayout({ children }: { children: React.ReactNode }) {
	const demoMode = process.env.PUBLIC_DEMO_MODE === 'true'
	return (
		<>
			{demoMode && (
				<div className='border-b border-border bg-yellow-500/10 px-6 py-2 text-center text-xs text-yellow-700 dark:text-yellow-300'>
					Demo mode — model outputs are deterministic synthetic data, not real provider calls.
					Names are illustrative.
				</div>
			)}
			<header className='sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur'>
				<div className='mx-auto flex max-w-6xl items-center gap-6 px-6 py-3 text-sm'>
					<Link href='/' className='shrink-0'>
						<Logo />
					</Link>
					<nav className='flex flex-1 items-center gap-1 overflow-x-auto'>
						<NavLink href='/suites'>Suites</NavLink>
						<NavLink href='/runs'>Runs</NavLink>
						<NavLink href='/costs'>Cost</NavLink>
						<NavLink href='/import'>Import</NavLink>
						<span className='mx-2 hidden h-4 w-px bg-border md:block' />
						<NavLink href='/connections'>Connections</NavLink>
						<NavLink href='/webhooks'>Webhooks</NavLink>
						<NavLink href='/api-docs'>API</NavLink>
					</nav>
					<div className='flex items-center gap-1'>
						<ThemeToggle />
						<a
							href='https://github.com/Rodman-Ai/Leo-LLM-Evals'
							target='_blank'
							rel='noopener'
							aria-label='GitHub repository'
							className='inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground'
						>
							<svg width='16' height='16' viewBox='0 0 16 16' fill='currentColor' aria-hidden='true'>
								<path
									fillRule='evenodd'
									d='M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.34c-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.13 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.03 2.2-.82 2.2-.82.44 1.11.16 1.93.08 2.13.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.19c0 .21.15.46.55.38A8 8 0 0016 8c0-4.42-3.58-8-8-8z'
								/>
							</svg>
						</a>
					</div>
				</div>
			</header>
			<main className='mx-auto max-w-6xl px-6 py-8'>{children}</main>
			<footer className='mt-16 border-t border-border'>
				<div className='mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground'>
					<span>
						<Logo size={14} /> · MIT licensed · open source
					</span>
					<div className='flex gap-4'>
						<Link href='/api-docs' className='hover:text-foreground'>
							API
						</Link>
						<a
							href='https://github.com/Rodman-Ai/Leo-LLM-Evals/tree/main/docs'
							className='hover:text-foreground'
							target='_blank'
							rel='noopener'
						>
							Docs
						</a>
						<a
							href='https://github.com/Rodman-Ai/Leo-LLM-Evals'
							className='hover:text-foreground'
							target='_blank'
							rel='noopener'
						>
							GitHub
						</a>
					</div>
				</div>
			</footer>
		</>
	)
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
	return (
		<Link
			href={href}
			className='rounded px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground'
		>
			{children}
		</Link>
	)
}
