import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLeaderboard } from '@/lib/db/queries'
import { ModelTag } from '@/components/ModelTag'
import { ScoreBar } from '@/components/ScoreBar'
import { PassRateBars } from '@/components/charts/PassRateBars'
import { passTextClass } from '@/lib/format'

export const revalidate = 3600

type Params = Promise<{ name: string }>

export default async function EmbedLeaderboard({ params }: { params: Params }) {
	const { name } = await params
	const decoded = decodeURIComponent(name)

	let data: Awaited<ReturnType<typeof getLeaderboard>> = { suite: null, entries: [] }
	try {
		data = await getLeaderboard(decoded)
	} catch {
		// fall through
	}
	if (!data.suite) notFound()

	return (
		<div className='space-y-3 p-4'>
			<div className='flex items-baseline justify-between gap-2'>
				<div className='text-sm font-medium'>{data.suite.name}</div>
				<Link
					href={`/leaderboard/${encodeURIComponent(data.suite.name)}`}
					target='_blank'
					rel='noopener'
					className='text-xs text-muted-foreground underline'
				>
					evalbench →
				</Link>
			</div>
			{data.entries.length === 0 ? (
				<p className='text-sm text-muted-foreground'>No completed runs yet.</p>
			) : (
				<>
					<div className='rounded-md border border-border bg-card p-2'>
						<PassRateBars
							data={data.entries.map((e) => ({
								model: e.model,
								rate: e.total ? e.passed / e.total : 0,
								passed: e.passed,
								total: e.total,
							}))}
						/>
					</div>
					<table className='w-full text-xs'>
						<tbody>
							{data.entries.map((e, i) => {
								const rate = e.total ? e.passed / e.total : 0
								return (
									<tr key={e.model} className='border-t border-border'>
										<td className='py-1.5 pr-2 text-muted-foreground tabular-nums'>{i + 1}</td>
										<td className='py-1.5 pr-2'>
											<ModelTag model={e.model} />
										</td>
										<td className='py-1.5 pr-2'>
											<div className='flex items-center gap-2'>
												<ScoreBar value={rate} />
												<span className={`text-xs ${passTextClass(rate)}`}>
													{e.passed}/{e.total}
												</span>
											</div>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</>
			)}
		</div>
	)
}
