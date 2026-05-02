import Link from 'next/link'
import { listSuites } from '@/lib/db/queries'
import { ScoreBar } from '@/components/ScoreBar'
import { formatDate, passTextClass } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function SuitesPage() {
	let suites: Awaited<ReturnType<typeof listSuites>> = []
	let error: string | null = null
	try {
		suites = await listSuites()
	} catch (err) {
		error = err instanceof Error ? err.message : String(err)
	}

	return (
		<div className='space-y-6'>
			<header>
				<h1 className='text-2xl font-semibold tracking-tight'>Suites</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Test suites discovered from <code className='rounded bg-muted px-1'>tests/**/*.eval.ts</code>{' '}
					and persisted on first run.
				</p>
			</header>

			{error ? (
				<div className='rounded-lg border border-border bg-muted/30 p-6 text-sm text-muted-foreground'>
					Database error: {error}
				</div>
			) : suites.length === 0 ? (
				<p className='text-sm text-muted-foreground'>
					No suites recorded. Run <code className='rounded bg-muted px-1'>pnpm eval</code> to bootstrap.
				</p>
			) : (
				<div className='grid gap-3 sm:grid-cols-2'>
					{suites.map((s) => {
						const rate = s.latestPassRate ?? 0
						return (
							<Link
								key={s.id}
								href={`/suites/${encodeURIComponent(s.name)}`}
								className='block rounded-lg border border-border p-4 hover:bg-muted/30'
							>
								<div className='flex items-center justify-between gap-2'>
									<h2 className='font-medium'>{s.name}</h2>
									<span className='text-xs text-muted-foreground'>{s.runCount} runs</span>
								</div>
								{s.description && (
									<p className='mt-1 text-sm text-muted-foreground line-clamp-2'>
										{s.description}
									</p>
								)}
								<div className='mt-3 flex items-center gap-2 text-xs'>
									{s.latestPassRate === null ? (
										<span className='text-muted-foreground'>no completed runs</span>
									) : (
										<>
											<ScoreBar value={rate} />
											<span className={passTextClass(rate)}>
												{Math.round(rate * 100)}%
											</span>
										</>
									)}
								</div>
								{s.lastRunAt && (
									<p className='mt-2 text-xs text-muted-foreground'>
										last run · {formatDate(s.lastRunAt)}
									</p>
								)}
							</Link>
						)
					})}
				</div>
			)}
		</div>
	)
}
