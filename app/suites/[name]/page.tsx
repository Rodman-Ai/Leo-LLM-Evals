import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLeaderboard, listRuns } from '@/lib/db/queries'
import { RunStatusBadge } from '@/components/RunStatusBadge'
import { ModelTag } from '@/components/ModelTag'
import { CostCell } from '@/components/CostCell'
import { ScoreBar } from '@/components/ScoreBar'
import { formatDate, formatLatency, passTextClass } from '@/lib/format'

export const dynamic = 'force-dynamic'

type Params = Promise<{ name: string }>

export default async function SuiteDetailPage({ params }: { params: Params }) {
	const { name } = await params
	const decoded = decodeURIComponent(name)

	let leaderboard: Awaited<ReturnType<typeof getLeaderboard>> = { suite: null, entries: [] }
	let runs: Awaited<ReturnType<typeof listRuns>> = []
	let error: string | null = null
	try {
		leaderboard = await getLeaderboard(decoded)
		if (leaderboard.suite) runs = await listRuns({ suiteName: decoded, limit: 30 })
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
	if (!leaderboard.suite) notFound()

	return (
		<div className='space-y-8'>
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
				<h2 className='text-lg font-medium'>Latest by model</h2>
				{leaderboard.entries.length === 0 ? (
					<p className='text-sm text-muted-foreground'>No completed runs yet.</p>
				) : (
					<div className='overflow-hidden rounded-lg border border-border'>
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
					<div className='overflow-hidden rounded-lg border border-border'>
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
