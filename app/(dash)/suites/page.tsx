import Link from 'next/link'
import { listSuites } from '@/lib/db/queries'
import { ScoreBar } from '@/components/ScoreBar'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorBlock } from '@/components/EmptyState'
import { formatDate, passTextClass } from '@/lib/format'

export const dynamic = 'force-dynamic'

export const metadata = {
	title: 'Suites · evalbench',
}

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
			<PageHeader
				title='Suites'
				description={
					<>
						Test suites discovered from{' '}
						<code className='rounded bg-muted px-1'>tests/**/*.eval.ts</code> and persisted on first
						run.
					</>
				}
			/>

			{error ? (
				<ErrorBlock message={error} />
			) : suites.length === 0 ? (
				<EmptyState
					title='No suites recorded yet'
					description={
						<>
							Run <code className='rounded bg-muted px-1'>pnpm eval</code> locally, or hit the
							seed endpoint at <code className='rounded bg-muted px-1'>/api/seed</code> to
							populate this dashboard with synthetic data.
						</>
					}
				/>
			) : (
				<div className='grid gap-3 sm:grid-cols-2'>
					{suites.map((s) => {
						const rate = s.latestPassRate ?? 0
						return (
							<Link
								key={s.id}
								href={`/suites/${encodeURIComponent(s.name)}`}
								className='group block rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm'
							>
								<div className='flex items-center justify-between gap-2'>
									<h2 className='font-semibold'>{s.name}</h2>
									<span className='rounded bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground'>
										{s.runCount} {s.runCount === 1 ? 'run' : 'runs'}
									</span>
								</div>
								{s.description && (
									<p className='mt-1.5 text-sm text-muted-foreground line-clamp-2'>
										{s.description}
									</p>
								)}
								<div className='mt-4 flex items-center gap-2 text-xs'>
									{s.latestPassRate === null ? (
										<span className='text-muted-foreground'>No completed runs</span>
									) : (
										<>
											<ScoreBar value={rate} />
											<span className={`tabular-nums ${passTextClass(rate)}`}>
												{Math.round(rate * 100)}%
											</span>
										</>
									)}
								</div>
								{s.lastRunAt && (
									<p className='mt-2 text-xs text-muted-foreground'>
										Last run · {formatDate(s.lastRunAt)}
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
