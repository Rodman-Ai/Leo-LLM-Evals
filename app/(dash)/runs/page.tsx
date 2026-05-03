import Link from 'next/link'
import { listRuns } from '@/lib/db/queries'
import { RunStatusBadge } from '@/components/RunStatusBadge'
import { ModelTag } from '@/components/ModelTag'
import { CostCell } from '@/components/CostCell'
import { ScoreBar } from '@/components/ScoreBar'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorBlock } from '@/components/EmptyState'
import { formatDate, formatLatency, passTextClass } from '@/lib/format'

export const dynamic = 'force-dynamic'

export const metadata = {
	title: 'Runs · evalbench',
}

type SearchParams = Promise<{ suite?: string }>

export default async function RunsPage({ searchParams }: { searchParams: SearchParams }) {
	const { suite } = await searchParams
	let runs: Awaited<ReturnType<typeof listRuns>> = []
	let error: string | null = null
	try {
		runs = await listRuns({ limit: 200, suiteName: suite })
	} catch (err) {
		error = err instanceof Error ? err.message : String(err)
	}

	return (
		<div className='space-y-6'>
			<PageHeader
				title='Runs'
				description={
					suite ? (
						<>
							Filtered by suite <span className='font-mono'>{suite}</span> ·{' '}
							<Link href='/runs' className='underline hover:text-foreground'>
								clear filter
							</Link>
						</>
					) : (
						'Most recent first. Click a status badge to drill into a run.'
					)
				}
			/>

			{error ? (
				<ErrorBlock message={error} />
			) : runs.length === 0 ? (
				<EmptyState
					title={suite ? `No runs for "${suite}" yet` : 'No runs yet'}
					description={
						suite ? (
							<>
								Try removing the filter or running{' '}
								<code className='rounded bg-muted px-1'>pnpm eval --suite={suite}</code>.
							</>
						) : (
							'Hit /api/seed or run pnpm eval locally to populate the dashboard.'
						)
					}
				/>
			) : (
				<div className='-mx-6 overflow-x-auto sm:mx-0 sm:rounded-xl sm:border sm:border-border'>
					<table className='w-full text-sm'>
						<thead className='bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground'>
							<tr>
								<th className='px-4 py-2.5'>#</th>
								<th className='px-4 py-2.5'>Suite</th>
								<th className='px-4 py-2.5'>Model</th>
								<th className='px-4 py-2.5'>Pass rate</th>
								<th className='px-4 py-2.5'>Cost</th>
								<th className='px-4 py-2.5'>Latency</th>
								<th className='px-4 py-2.5'>Branch</th>
								<th className='px-4 py-2.5'>Started</th>
								<th className='px-4 py-2.5'>Status</th>
							</tr>
						</thead>
						<tbody>
							{runs.map((r) => {
								const rate = r.total ? r.passed / r.total : 0
								return (
									<tr key={r.id} className='border-t border-border transition-colors hover:bg-muted/40'>
										<td className='px-4 py-2.5 tabular-nums text-muted-foreground'>{r.id}</td>
										<td className='px-4 py-2.5'>
											<Link
												href={`/runs?suite=${r.suiteName}`}
												className='hover:underline'
											>
												{r.suiteName}
											</Link>
										</td>
										<td className='px-4 py-2.5'>
											<ModelTag model={r.model} />
										</td>
										<td className='px-4 py-2.5'>
											<div className='flex items-center gap-2'>
												<ScoreBar value={rate} />
												<span className={`text-xs tabular-nums ${passTextClass(rate)}`}>
													{r.passed}/{r.total}
												</span>
											</div>
										</td>
										<td className='px-4 py-2.5'>
											<CostCell cents={r.costCents} />
										</td>
										<td className='px-4 py-2.5 tabular-nums text-muted-foreground'>
											{formatLatency(r.avgLatencyMs)}
										</td>
										<td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground'>
											{r.gitBranch ?? '—'}
										</td>
										<td className='whitespace-nowrap px-4 py-2.5 text-muted-foreground'>
											{formatDate(r.startedAt)}
										</td>
										<td className='px-4 py-2.5'>
											<Link href={`/runs/${r.id}`} className='hover:opacity-80'>
												<RunStatusBadge status={r.status} />
											</Link>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	)
}
