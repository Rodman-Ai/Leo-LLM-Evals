import Link from 'next/link'
import { getCompareData } from '@/lib/db/queries'
import { ModelTag } from '@/components/ModelTag'
import { CostCell } from '@/components/CostCell'
import { ScoreBar } from '@/components/ScoreBar'
import { formatDate, formatLatency, passTextClass } from '@/lib/format'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ a?: string; b?: string }>

export default async function ComparePage({ searchParams }: { searchParams: SearchParams }) {
	const sp = await searchParams
	const aId = Number(sp.a)
	const bId = Number(sp.b)

	if (!Number.isFinite(aId) || !Number.isFinite(bId) || aId <= 0 || bId <= 0) {
		return (
			<div className='space-y-4'>
				<h1 className='text-2xl font-semibold tracking-tight'>Compare runs</h1>
				<p className='text-sm text-muted-foreground'>
					Pass two run ids as query params: <code className='rounded bg-muted px-1'>?a=1&b=2</code>.
					Pick runs from the <Link href='/runs' className='underline'>Runs</Link> list.
				</p>
			</div>
		)
	}

	let data: Awaited<ReturnType<typeof getCompareData>> = { a: null, b: null, pairs: [] }
	let error: string | null = null
	try {
		data = await getCompareData(aId, bId)
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
	if (!data.a || !data.b) {
		return <p className='text-sm text-muted-foreground'>One or both runs not found.</p>
	}

	const aTotal = data.pairs.filter((p) => p.a).length
	const aPassed = data.pairs.filter((p) => p.a?.passed).length
	const bTotal = data.pairs.filter((p) => p.b).length
	const bPassed = data.pairs.filter((p) => p.b?.passed).length
	const aRate = aTotal ? aPassed / aTotal : 0
	const bRate = bTotal ? bPassed / bTotal : 0
	const aCost = data.pairs.reduce((s, p) => s + (p.a?.costCents ?? 0), 0)
	const bCost = data.pairs.reduce((s, p) => s + (p.b?.costCents ?? 0), 0)
	const aAvgLatency = aTotal
		? Math.round(data.pairs.reduce((s, p) => s + (p.a?.latencyMs ?? 0), 0) / aTotal)
		: 0
	const bAvgLatency = bTotal
		? Math.round(data.pairs.reduce((s, p) => s + (p.b?.latencyMs ?? 0), 0) / bTotal)
		: 0

	const regressions = data.pairs.filter((p) => p.a?.passed && p.b && !p.b.passed)
	const improvements = data.pairs.filter((p) => p.a && !p.a.passed && p.b?.passed)

	return (
		<div className='space-y-8'>
			<header className='space-y-3'>
				<div className='text-sm text-muted-foreground'>
					<Link href='/runs' className='hover:underline'>
						Runs
					</Link>
					<span className='mx-2'>/</span>Compare
				</div>
				<div className='grid grid-cols-2 gap-4'>
					<RunCard label='A' run={data.a} rate={aRate} passed={aPassed} total={aTotal} cost={aCost} avgLatency={aAvgLatency} />
					<RunCard label='B' run={data.b} rate={bRate} passed={bPassed} total={bTotal} cost={bCost} avgLatency={bAvgLatency} />
				</div>
				<DeltaBar
					label='Pass rate'
					a={`${aPassed}/${aTotal} (${Math.round(aRate * 100)}%)`}
					b={`${bPassed}/${bTotal} (${Math.round(bRate * 100)}%)`}
					delta={(bRate - aRate) * 100}
					unit='pp'
					improved={(d) => d > 0}
				/>
				<DeltaBar
					label='Total cost'
					a={`$${(aCost / 100).toFixed(4)}`}
					b={`$${(bCost / 100).toFixed(4)}`}
					delta={(bCost - aCost) / 100}
					unit='$'
					improved={(d) => d < 0}
				/>
				<DeltaBar
					label='Avg latency'
					a={formatLatency(aAvgLatency)}
					b={formatLatency(bAvgLatency)}
					delta={bAvgLatency - aAvgLatency}
					unit='ms'
					improved={(d) => d < 0}
				/>
				{(regressions.length > 0 || improvements.length > 0) && (
					<div className='flex gap-4 text-sm'>
						{improvements.length > 0 && (
							<span className='text-green-600 dark:text-green-400'>
								+{improvements.length} improvement{improvements.length === 1 ? '' : 's'}
							</span>
						)}
						{regressions.length > 0 && (
							<span className='text-red-600 dark:text-red-400'>
								-{regressions.length} regression{regressions.length === 1 ? '' : 's'}
							</span>
						)}
					</div>
				)}
			</header>

			<section>
				<div className='overflow-x-auto rounded-lg border border-border'>
					<table className='w-full text-sm'>
						<thead className='bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground'>
							<tr>
								<th className='px-3 py-2 w-1/3'>Input</th>
								<th className='px-3 py-2 w-1/3'>A · {data.a.model}</th>
								<th className='px-3 py-2 w-1/3'>B · {data.b.model}</th>
							</tr>
						</thead>
						<tbody>
							{data.pairs.map((p) => (
								<tr key={p.testId} className='border-t border-border align-top'>
									<td className='px-3 py-3'>
										<div className='line-clamp-3' title={p.input}>
											{p.input}
										</div>
										{p.expected && (
											<div className='mt-1 font-mono text-xs text-muted-foreground'>
												exp: {p.expected}
											</div>
										)}
									</td>
									<CompareCell side={p.a} other={p.b} />
									<CompareCell side={p.b} other={p.a} />
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	)
}

function RunCard({
	label,
	run,
	rate,
	passed,
	total,
	cost,
	avgLatency,
}: {
	label: string
	run: { id: number; suiteName: string; model: string; startedAt: Date }
	rate: number
	passed: number
	total: number
	cost: number
	avgLatency: number
}) {
	return (
		<Link href={`/runs/${run.id}`} className='block rounded-lg border border-border p-4 hover:bg-muted/30'>
			<div className='flex items-center gap-2 text-xs text-muted-foreground'>
				<span className='rounded bg-muted px-1.5 py-0.5 font-mono'>{label}</span>
				<span>#{run.id}</span>
				<span>·</span>
				<span>{run.suiteName}</span>
			</div>
			<div className='mt-2'>
				<ModelTag model={run.model} />
			</div>
			<div className={`mt-2 text-lg font-medium ${passTextClass(rate)}`}>
				{passed}/{total} ({Math.round(rate * 100)}%)
			</div>
			<div className='mt-1 text-xs text-muted-foreground'>
				<CostCell cents={cost} /> · {formatLatency(avgLatency)} avg · {formatDate(run.startedAt)}
			</div>
		</Link>
	)
}

function DeltaBar({
	label,
	a,
	b,
	delta,
	unit,
	improved,
}: {
	label: string
	a: string
	b: string
	delta: number
	unit: string
	improved: (delta: number) => boolean
}) {
	const isImproved = delta !== 0 && improved(delta)
	const isRegressed = delta !== 0 && !isImproved
	const sign = delta > 0 ? '+' : ''
	const formatted = unit === '$' ? `${sign}$${delta.toFixed(4)}` : `${sign}${delta.toFixed(unit === 'pp' ? 1 : 0)}${unit}`
	const color = isImproved
		? 'text-green-600 dark:text-green-400'
		: isRegressed
			? 'text-red-600 dark:text-red-400'
			: 'text-muted-foreground'
	return (
		<div className='flex items-center gap-3 text-sm'>
			<span className='w-24 text-muted-foreground'>{label}</span>
			<span className='font-mono'>{a}</span>
			<span className='text-muted-foreground'>→</span>
			<span className='font-mono'>{b}</span>
			<span className={`font-mono ${color}`}>{delta === 0 ? '—' : formatted}</span>
		</div>
	)
}

function CompareCell({
	side,
	other,
}: {
	side: { output: string | null; passed: boolean; costCents: number; latencyMs: number; errorMessage: string | null; scores: { value: number }[] } | null
	other: unknown
}) {
	if (!side) {
		return (
			<td className='px-3 py-3 text-xs text-muted-foreground italic'>
				{other ? 'no result for this run' : '—'}
			</td>
		)
	}
	const score = side.scores.length
		? side.scores.reduce((s, x) => s + x.value, 0) / side.scores.length
		: 0
	return (
		<td className='px-3 py-3'>
			<div className='flex items-center gap-2'>
				{side.passed ? (
					<span className='text-green-600 dark:text-green-400'>✓</span>
				) : (
					<span className='text-red-600 dark:text-red-400'>✗</span>
				)}
				<ScoreBar value={score} />
			</div>
			<div className='mt-2 font-mono text-xs whitespace-pre-wrap'>
				{side.errorMessage ? (
					<span className='text-red-600 dark:text-red-400'>{side.errorMessage}</span>
				) : (
					(side.output ?? '—')
				)}
			</div>
			<div className='mt-1 text-xs text-muted-foreground'>
				<CostCell cents={side.costCents} /> · {formatLatency(side.latencyMs)}
			</div>
		</td>
	)
}
