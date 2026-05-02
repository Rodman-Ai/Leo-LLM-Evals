import Link from 'next/link'
import { listRuns } from '@/lib/db/queries'
import { RunStatusBadge } from '@/components/RunStatusBadge'
import { ModelTag } from '@/components/ModelTag'
import { CostCell } from '@/components/CostCell'
import { ScoreBar } from '@/components/ScoreBar'
import { formatDate, formatLatency, passTextClass } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
	let runs: Awaited<ReturnType<typeof listRuns>> = []
	let error: string | null = null
	try {
		runs = await listRuns({ limit: 20 })
	} catch (err) {
		error = err instanceof Error ? err.message : String(err)
	}

	return (
		<div className='space-y-8'>
			<header className='space-y-2'>
				<h1 className='text-3xl font-semibold tracking-tight'>evalbench</h1>
				<p className='text-muted-foreground'>
					Code-defined LLM evals. Run suites, compare models, track regressions.
				</p>
			</header>

			{error ? (
				<div className='rounded-lg border border-border bg-muted/30 p-6'>
					<h2 className='font-medium'>Database not connected</h2>
					<p className='mt-1 text-sm text-muted-foreground'>
						Set <code className='rounded bg-muted px-1'>DATABASE_URL</code> and run{' '}
						<code className='rounded bg-muted px-1'>pnpm db:push</code> to get started. Detail:{' '}
						{error}
					</p>
				</div>
			) : runs.length === 0 ? (
				<EmptyState />
			) : (
				<section className='space-y-3'>
					<h2 className='text-lg font-medium'>Recent runs</h2>
					<div className='overflow-hidden rounded-lg border border-border'>
						<table className='w-full text-sm'>
							<thead className='bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground'>
								<tr>
									<th className='px-4 py-2'>Suite</th>
									<th className='px-4 py-2'>Model</th>
									<th className='px-4 py-2'>Pass rate</th>
									<th className='px-4 py-2'>Cost</th>
									<th className='px-4 py-2'>Avg latency</th>
									<th className='px-4 py-2'>Started</th>
									<th className='px-4 py-2'>Status</th>
								</tr>
							</thead>
							<tbody>
								{runs.map((r) => {
									const rate = r.total ? r.passed / r.total : 0
									return (
										<tr
											key={r.id}
											className='border-t border-border hover:bg-muted/30'
										>
											<td className='px-4 py-2'>
												<Link
													href={`/runs/${r.id}`}
													className='font-medium hover:underline'
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
											<td className='px-4 py-2 text-muted-foreground'>
												{formatDate(r.startedAt)}
											</td>
											<td className='px-4 py-2'>
												<RunStatusBadge status={r.status} />
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				</section>
			)}
		</div>
	)
}

function EmptyState() {
	return (
		<div className='rounded-lg border border-dashed border-border bg-muted/20 p-10 text-center'>
			<h2 className='font-medium'>No runs yet</h2>
			<p className='mx-auto mt-2 max-w-md text-sm text-muted-foreground'>
				Run <code className='rounded bg-muted px-1'>pnpm eval --suite=toy</code> to execute the
				smoke-test suite. Results land here.
			</p>
		</div>
	)
}
