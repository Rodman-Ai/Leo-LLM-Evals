import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
	title: 'evalbench',
	description: 'Code-defined LLM evals with a real comparison dashboard.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	const demoMode = process.env.PUBLIC_DEMO_MODE === 'true'
	return (
		<html lang='en'>
			<body className='min-h-screen antialiased'>
				{demoMode && (
					<div className='border-b border-border bg-yellow-500/10 px-6 py-2 text-center text-xs text-yellow-700 dark:text-yellow-300'>
						Demo mode — model outputs are deterministic synthetic data, not real provider
						calls. Names are illustrative.
					</div>
				)}
				<header className='border-b border-border'>
					<nav className='mx-auto flex max-w-6xl items-center gap-6 px-6 py-4 text-sm'>
						<Link href='/' className='font-semibold'>
							evalbench
						</Link>
						<Link href='/suites' className='text-muted-foreground hover:text-foreground'>
							Suites
						</Link>
						<Link href='/runs' className='text-muted-foreground hover:text-foreground'>
							Runs
						</Link>
					</nav>
				</header>
				<main className='mx-auto max-w-6xl px-6 py-8'>{children}</main>
			</body>
		</html>
	)
}
