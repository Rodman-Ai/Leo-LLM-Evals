import Link from 'next/link'
import { listRuns } from '@/lib/db/queries'
import { RunStatusBadge } from '@/components/RunStatusBadge'
import { ModelTag } from '@/components/ModelTag'
import { CostCell } from '@/components/CostCell'
import { ScoreBar } from '@/components/ScoreBar'
import { formatDate, formatLatency, passTextClass } from '@/lib/format'

export const dynamic = 'force-dynamic'

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
			<header>
				<h1 className='text-2xl font-semibold tracking-tight'>Runs</h1>
				{suite && (
					<p className='mt-1 text-sm text-muted-foreground'>
						Filtered by suite: <span className='font-mono'>{suite}</span> ·{' '}
						<Link href='/runs' className='underline'>
							clear
						</Link>
					</p>
				)}
			</header>

			{error ? (
				<div className='rounded-lg border border-border bg-muted/30 p-6 text-sm text-muted-foreground'>
					Database error: {error}
				</div>
			) : runs.length === 0 ? (
				<p className='text-sm text-muted-foreground'>No runs match the filter.</p>
			) : (
				<div className='overflow-hidden rounded-lg border border-border'>
					<table className='w-full text-sm'>
						<thead className='bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground'>
							<tr>
								<th className='px-4 py-2'>#</th>
								<th className='px-4 py-2'>Suite</th>
								<th className='px-4 py-2'>Model</th>
								<th className='px-4 py-2'>Pass rate</th>
								<th className='px-4 py-2'>Cost</th>
								<th className='px-4 py-2'>Latency</th>
								<th className='px-4 py-2'>Branch</th>
								<th className='px-4 py-2'>Started</th>
								<th className='px-4 py-2'>Status</th>
							</tr>
						</thead>
						<tbody>
							{runs.map((r) => {
								const rate = r.total ? r.passed / r.total : 0
								return (
									<tr key={r.id} className='border-t border-border hover:bg-muted/30'>
										<td className='px-4 py-2 text-muted-foreground'>{r.id}</td>
										<td className='px-4 py-2'>
											<Link
												href={`/runs?suite=${r.suiteName}`}
												className='hover:underline'
											>
												{r.suiteName}
											</Link>
										</td>
										<td className='px-4 py-2'>
											<ModelTag model={r.model} />
										</td>
										<td className='px-4 py-2'>
											<div className='flex items-center gap-2'>
												<ScoreBar value={rate} />
												<span className={`text-xs ${passTextClass(rate)}`}>
													{r.passed}/{r.total}
												</span>
											</div>
										</td>
										<td className='px-4 py-2'>
											<CostCell cents={r.costCents} />
										</td>
										<td className='px-4 py-2 tabular-nums text-muted-foreground'>
											{formatLatency(r.avgLatencyMs)}
										</td>
										<td className='px-4 py-2 font-mono text-xs text-muted-foreground'>
											{r.gitBranch ?? '—'}
										</td>
										<td className='px-4 py-2 text-muted-foreground'>
											{formatDate(r.startedAt)}
										</td>
										<td className='px-4 py-2'>
											<Link href={`/runs/${r.id}`}>
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
