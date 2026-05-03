import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLeaderboard, getSuiteTimeline, listRuns, type TimelineRunRow } from '@/lib/db/queries'
import { RunStatusBadge } from '@/components/RunStatusBadge'
import { ModelTag } from '@/components/ModelTag'
import { CostCell } from '@/components/CostCell'
import { ScoreBar } from '@/components/ScoreBar'
import { PassRateTimeline, type TimelinePoint } from '@/components/charts/PassRateTimeline'
import { formatDate, formatLatency, passTextClass } from '@/lib/format'

function buildTimelineData(rows: TimelineRunRow[]): { points: TimelinePoint[]; models: string[] } {
	const models = Array.from(new Set(rows.map((r) => r.model))).sort()
	const points: TimelinePoint[] = rows.map((r) => {
		const point: TimelinePoint = {
			startedAt: new Date(r.startedAt).toLocaleString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			}),
		}
		for (const m of models) point[m] = null
		point[r.model] = r.total ? r.passed / r.total : 0
		return point
	})
	return { points, models }
}

export const dynamic = 'force-dynamic'

type Params = Promise<{ name: string }>
type SearchParams = Promise<{ created?: string; imported?: string }>

export default async function SuiteDetailPage({
	params,
	searchParams,
}: {
	params: Params
	searchParams: SearchParams
}) {
	const { name } = await params
	const sp = await searchParams
	const decoded = decodeURIComponent(name)

	let leaderboard: Awaited<ReturnType<typeof getLeaderboard>> = { suite: null, entries: [] }
	let runs: Awaited<ReturnType<typeof listRuns>> = []
	let timelineRows: TimelineRunRow[] = []
	let error: string | null = null
	try {
		leaderboard = await getLeaderboard(decoded)
		if (leaderboard.suite) {
			runs = await listRuns({ suiteName: decoded, limit: 30 })
			timelineRows = await getSuiteTimeline(decoded, 200)
		}
	} catch (err) {
		error = err instanceof Error ? err.message : String(err)
	}

	const timeline = buildTimelineData(timelineRows)

	if (error) {
		return (
			<div className='rounded-lg border border-border bg-muted/30 p-6 text-sm text-muted-foreground'>
				Database error: {error}
			</div>
		)
	}
	if (!leaderboard.suite) notFound()

	return (
		<div className='space-y-8'>
			{(sp.created === '1' || sp.imported === '1') && (
				<div className='rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-2.5 text-sm text-green-700 dark:text-green-300'>
					{sp.imported === '1'
						? 'Suite imported. Cases populated; runs will appear once you execute them.'
						: 'Suite created. Add cases by importing or running.'}
				</div>
			)}
			<header className='space-y-2'>
				<div className='text-sm text-muted-foreground'>
					<Link href='/suites' className='hover:underline'>
						Suites
					</Link>
					<span className='mx-2'>/</span>
					{leaderboard.suite.name}
				</div>
				<div className='flex flex-wrap items-baseline gap-3'>
					<h1 className='text-3xl font-semibold tracking-tight'>{leaderboard.suite.name}</h1>
					<Link
						href={`/leaderboard/${encodeURIComponent(leaderboard.suite.name)}`}
						className='text-sm text-muted-foreground underline'
					>
						public leaderboard →
					</Link>
				</div>
				{leaderboard.suite.description && (
					<p className='max-w-2xl text-muted-foreground'>{leaderboard.suite.description}</p>
				)}
			</header>

			<section className='space-y-3'>
				<h2 className='text-lg font-medium'>Pass rate over time</h2>
				<div className='rounded-lg border border-border bg-card p-4'>
					<PassRateTimeline data={timeline.points} models={timeline.models} />
				</div>
			</section>

			<section className='space-y-3'>
				<h2 className='text-lg font-medium'>Latest by model</h2>
				{leaderboard.entries.length === 0 ? (
					<p className='text-sm text-muted-foreground'>No completed runs yet.</p>
				) : (
					<div className='overflow-x-auto rounded-lg border border-border'>
						<table className='w-full text-sm'>
							<thead className='bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground'>
								<tr>
									<th className='px-4 py-2'>Model</th>
									<th className='px-4 py-2'>Pass rate</th>
									<th className='px-4 py-2'>Cost / case</th>
									<th className='px-4 py-2'>Latency</th>
									<th className='px-4 py-2'>Runs</th>
								</tr>
							</thead>
							<tbody>
								{leaderboard.entries.map((e) => {
									const rate = e.total ? e.passed / e.total : 0
									return (
										<tr key={e.model} className='border-t border-border'>
											<td className='px-4 py-2'>
												<ModelTag model={e.model} />
											</td>
											<td className='px-4 py-2'>
												<div className='flex items-center gap-2'>
													<ScoreBar value={rate} />
													<span className={`text-xs ${passTextClass(rate)}`}>
														{e.passed}/{e.total}
													</span>
												</div>
											</td>
											<td className='px-4 py-2'>
												<CostCell cents={e.avgCostCents} />
											</td>
											<td className='px-4 py-2 tabular-nums text-muted-foreground'>
												{formatLatency(e.avgLatencyMs)}
											</td>
											<td className='px-4 py-2 tabular-nums text-muted-foreground'>
												{e.runs}
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<section className='space-y-3'>
				<h2 className='text-lg font-medium'>Recent runs</h2>
				{runs.length === 0 ? (
					<p className='text-sm text-muted-foreground'>No runs yet.</p>
				) : (
					<div className='overflow-x-auto rounded-lg border border-border'>
						<table className='w-full text-sm'>
							<thead className='bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground'>
								<tr>
									<th className='px-4 py-2'>#</th>
									<th className='px-4 py-2'>Model</th>
									<th className='px-4 py-2'>Pass rate</th>
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
			</section>
		</div>
	)
}
