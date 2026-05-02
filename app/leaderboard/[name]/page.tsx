import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLeaderboard } from '@/lib/db/queries'
import { ModelTag } from '@/components/ModelTag'
import { CostCell } from '@/components/CostCell'
import { ScoreBar } from '@/components/ScoreBar'
import { PassRateBars } from '@/components/charts/PassRateBars'
import { formatDate, formatLatency, passTextClass } from '@/lib/format'

export const revalidate = 3600

type Params = Promise<{ name: string }>

export default async function LeaderboardPage({ params }: { params: Params }) {
	const { name } = await params
	const decoded = decodeURIComponent(name)

	let data: Awaited<ReturnType<typeof getLeaderboard>> = { suite: null, entries: [] }
	let error: string | null = null
	try {
		data = await getLeaderboard(decoded)
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
	if (!data.suite) notFound()

	return (
		<div className='space-y-8'>
			<header className='space-y-2'>
				<div className='text-sm text-muted-foreground'>
					<Link href='/suites' className='hover:underline'>
						Suites
					</Link>
					<span className='mx-2'>/</span>
					{data.suite.name}
				</div>
				<h1 className='text-3xl font-semibold tracking-tight'>{data.suite.name} leaderboard</h1>
				{data.suite.description && (
					<p className='max-w-2xl text-muted-foreground'>{data.suite.description}</p>
				)}
				<p className='text-xs text-muted-foreground'>
					Each row is the latest complete run of {data.suite.name} for that model. Updated hourly.
				</p>
			</header>

			{data.entries.length === 0 ? (
				<p className='text-sm text-muted-foreground'>No completed runs yet.</p>
			) : (
				<div className='space-y-4'>
					<div className='rounded-lg border border-border bg-card p-4'>
						<PassRateBars
							data={data.entries.map((e) => ({
								model: e.model,
								rate: e.total ? e.passed / e.total : 0,
								passed: e.passed,
								total: e.total,
							}))}
						/>
					</div>
					<div className='overflow-hidden rounded-lg border border-border'>
					<table className='w-full text-sm'>
						<thead className='bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground'>
							<tr>
								<th className='px-4 py-2'>#</th>
								<th className='px-4 py-2'>Model</th>
								<th className='px-4 py-2'>Pass rate</th>
								<th className='px-4 py-2'>Avg cost / case</th>
								<th className='px-4 py-2'>Avg latency</th>
								<th className='px-4 py-2'>Runs</th>
								<th className='px-4 py-2'>Latest</th>
							</tr>
						</thead>
						<tbody>
							{data.entries.map((e, i) => {
								const rate = e.total ? e.passed / e.total : 0
								return (
									<tr key={e.model} className='border-t border-border hover:bg-muted/30'>
										<td className='px-4 py-3 text-muted-foreground tabular-nums'>{i + 1}</td>
										<td className='px-4 py-3'>
											<ModelTag model={e.model} />
										</td>
										<td className='px-4 py-3'>
											<div className='flex items-center gap-2'>
												<ScoreBar value={rate} />
												<span className={`text-xs ${passTextClass(rate)}`}>
													{e.passed}/{e.total}
												</span>
											</div>
										</td>
										<td className='px-4 py-3'>
											<CostCell cents={e.avgCostCents} />
										</td>
										<td className='px-4 py-3 tabular-nums text-muted-foreground'>
											{formatLatency(e.avgLatencyMs)}
										</td>
										<td className='px-4 py-3 tabular-nums text-muted-foreground'>{e.runs}</td>
										<td className='px-4 py-3 text-muted-foreground'>
											<Link href={`/runs/${e.latestRunId}`} className='hover:underline'>
												{formatDate(e.latestStartedAt)}
											</Link>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
				</div>
			)}
		</div>
	)
}
