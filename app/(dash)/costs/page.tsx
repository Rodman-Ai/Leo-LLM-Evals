import Link from 'next/link'
import { getCostBreakdown } from '@/lib/db/queries'
import { CostByDayLine } from '@/components/charts/CostByDayLine'
import { CostByCategory } from '@/components/charts/CostByCategory'
import { ModelTag } from '@/components/ModelTag'
import { CostCell } from '@/components/CostCell'
import { formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function CostsPage() {
	let data: Awaited<ReturnType<typeof getCostBreakdown>> = {
		totalCents: 0,
		byDay: [],
		byModel: [],
		bySuite: [],
		topRuns: [],
	}
	let error: string | null = null
	try {
		data = await getCostBreakdown()
	} catch (err) {
		error = err instanceof Error ? err.message : String(err)
	}

	if (error) {
		return (
			<div className='rounded-lg border border-border bg-muted/30 p-6 text-sm text-muted-foreground'>
				Database error: {error}
			</div>
		)
	}

	return (
		<div className='space-y-8'>
			<header className='space-y-2'>
				<h1 className='text-3xl font-semibold tracking-tight'>Cost</h1>
				<p className='text-muted-foreground'>
					Where the dollars are going. Cost is per-result, summed up per run.
				</p>
			</header>

			<section className='grid gap-3 sm:grid-cols-3'>
				<MetricCard
					label='Total spend'
					value={`$${(data.totalCents / 100).toFixed(2)}`}
					sub={`${data.byDay.reduce((s, d) => s + d.runs, 0)} completed runs`}
				/>
				<MetricCard
					label='Most expensive model'
					value={data.byModel[0] ? data.byModel[0].model.split(':')[1] ?? data.byModel[0].model : '—'}
					sub={data.byModel[0] ? `$${(data.byModel[0].costCents / 100).toFixed(2)}` : ''}
				/>
				<MetricCard
					label='Most expensive suite'
					value={data.bySuite[0]?.suiteName ?? '—'}
					sub={data.bySuite[0] ? `$${(data.bySuite[0].costCents / 100).toFixed(2)}` : ''}
				/>
			</section>

			<section className='space-y-3'>
				<h2 className='text-lg font-medium'>Daily spend</h2>
				<div className='rounded-lg border border-border bg-card p-4'>
					<CostByDayLine data={data.byDay} />
				</div>
			</section>

			<section className='grid gap-6 lg:grid-cols-2'>
				<div className='space-y-3'>
					<h2 className='text-lg font-medium'>By model</h2>
					<div className='rounded-lg border border-border bg-card p-4'>
						<CostByCategory
							data={data.byModel.map((m) => ({
								label: m.model,
								costCents: m.costCents,
								runs: m.runs,
							}))}
						/>
					</div>
				</div>
				<div className='space-y-3'>
					<h2 className='text-lg font-medium'>By suite</h2>
					<div className='rounded-lg border border-border bg-card p-4'>
						<CostByCategory
							data={data.bySuite.map((s) => ({
								label: s.suiteName,
								costCents: s.costCents,
								runs: s.runs,
							}))}
						/>
					</div>
				</div>
			</section>

			<section className='space-y-3'>
				<h2 className='text-lg font-medium'>Top 10 most expensive runs</h2>
				{data.topRuns.length === 0 ? (
					<p className='text-sm text-muted-foreground'>No runs yet.</p>
				) : (
					<div className='overflow-x-auto rounded-lg border border-border'>
						<table className='w-full text-sm'>
							<thead className='bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground'>
								<tr>
									<th className='px-4 py-2'>#</th>
									<th className='px-4 py-2'>Suite</th>
									<th className='px-4 py-2'>Model</th>
									<th className='px-4 py-2'>Cost</th>
									<th className='px-4 py-2'>Started</th>
								</tr>
							</thead>
							<tbody>
								{data.topRuns.map((r) => (
									<tr key={r.id} className='border-t border-border hover:bg-muted/30'>
										<td className='px-4 py-2 text-muted-foreground'>{r.id}</td>
										<td className='px-4 py-2'>
											<Link href={`/suites/${r.suiteName}`} className='hover:underline'>
												{r.suiteName}
											</Link>
										</td>
										<td className='px-4 py-2'>
											<ModelTag model={r.model} />
										</td>
										<td className='px-4 py-2'>
											<Link href={`/runs/${r.id}`} className='hover:underline'>
												<CostCell cents={r.costCents} />
											</Link>
										</td>
										<td className='px-4 py-2 text-muted-foreground'>
											{formatDate(r.startedAt)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>
		</div>
	)
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
	return (
		<div className='rounded-lg border border-border bg-card p-4'>
			<div className='text-xs uppercase tracking-wide text-muted-foreground'>{label}</div>
			<div className='mt-1 text-2xl font-semibold tabular-nums'>{value}</div>
			{sub && <div className='mt-1 text-xs text-muted-foreground'>{sub}</div>}
		</div>
	)
}
