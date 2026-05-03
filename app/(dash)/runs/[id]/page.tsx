import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getRun, getRunResults } from '@/lib/db/queries'
import { getSession } from '@/lib/auth/session'
import { readGoogleConfig } from '@/lib/auth/google'
import { readMicrosoftConfig } from '@/lib/auth/microsoft'
import { RunStatusBadge } from '@/components/RunStatusBadge'
import { ModelTag } from '@/components/ModelTag'
import { CostCell } from '@/components/CostCell'
import { ScoreBar } from '@/components/ScoreBar'
import { ExportMenu } from '@/components/ExportMenu'
import { SourceBadge, ImportedChip } from '@/components/SourceBadge'
import { formatDate, formatLatency, passTextClass } from '@/lib/format'

async function origin(): Promise<string> {
	const h = await headers()
	const proto = h.get('x-forwarded-proto') ?? 'http'
	return `${proto}://${h.get('host') ?? 'localhost:3000'}`
}

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>

export default async function RunDetailPage({ params }: { params: Params }) {
	const { id: idStr } = await params
	const id = Number(idStr)
	if (!Number.isFinite(id) || id <= 0) notFound()

	let run: Awaited<ReturnType<typeof getRun>> | null = null
	let results: Awaited<ReturnType<typeof getRunResults>> = []
	let error: string | null = null
	try {
		run = await getRun(id)
		if (run) results = await getRunResults(id)
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
	if (!run) notFound()

	const session = await getSession()
	const o = await origin()
	const googleConfigured = readGoogleConfig(o) !== null
	const microsoftConfigured = readMicrosoftConfig(o) !== null

	const total = results.length
	const passed = results.filter((r) => r.passed).length
	const rate = total ? passed / total : 0
	const totalCost = results.reduce((s, r) => s + r.costCents, 0)
	const avgLatency = total ? Math.round(results.reduce((s, r) => s + r.latencyMs, 0) / total) : 0
	const isImported =
		(run.triggeredBy === 'import') ||
		(results.length > 0 && results.every((r) => r.source === 'import'))

	return (
		<div className='space-y-8'>
			<header className='space-y-3'>
				<div className='flex items-center gap-3 text-sm text-muted-foreground'>
					<Link href='/runs' className='hover:underline'>
						Runs
					</Link>
					<span>/</span>
					<span className='font-mono'>#{run.id}</span>
				</div>
				<div className='flex flex-wrap items-center gap-3'>
					<h1 className='text-2xl font-semibold tracking-tight'>{run.suiteName}</h1>
					<ModelTag model={run.model} />
					<RunStatusBadge status={run.status} />
					{isImported && <ImportedChip />}
					<div className='ml-auto'>
						<ExportMenu
							csvHref={`/api/runs/${run.id}/export.csv`}
							googleSheetsPath={`/api/runs/${run.id}/export/google-sheets`}
							onedrivePath={`/api/runs/${run.id}/export/onedrive`}
							googleConfigured={googleConfigured}
							microsoftConfigured={microsoftConfigured}
							googleConnected={Boolean(session.google)}
							microsoftConnected={Boolean(session.microsoft)}
						/>
					</div>
				</div>

				<dl className='grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4'>
					<div>
						<dt className='text-xs uppercase tracking-wide text-muted-foreground'>Pass rate</dt>
						<dd className={`mt-1 font-medium ${passTextClass(rate)}`}>
							{passed}/{total} ({Math.round(rate * 100)}%)
						</dd>
					</div>
					<div>
						<dt className='text-xs uppercase tracking-wide text-muted-foreground'>Cost</dt>
						<dd className='mt-1 font-medium'>
							<CostCell cents={totalCost} />
						</dd>
					</div>
					<div>
						<dt className='text-xs uppercase tracking-wide text-muted-foreground'>Avg latency</dt>
						<dd className='mt-1 font-medium tabular-nums'>{formatLatency(avgLatency)}</dd>
					</div>
					<div>
						<dt className='text-xs uppercase tracking-wide text-muted-foreground'>Started</dt>
						<dd className='mt-1 font-medium'>{formatDate(run.startedAt)}</dd>
					</div>
					{run.gitSha && (
						<div>
							<dt className='text-xs uppercase tracking-wide text-muted-foreground'>Git</dt>
							<dd className='mt-1 font-mono text-xs'>
								{run.gitBranch ? `${run.gitBranch} · ` : ''}
								{run.gitSha.slice(0, 7)}
							</dd>
						</div>
					)}
					{run.triggeredBy && (
						<div>
							<dt className='text-xs uppercase tracking-wide text-muted-foreground'>Triggered</dt>
							<dd className='mt-1 font-medium'>{run.triggeredBy}</dd>
						</div>
					)}
				</dl>

				<details className='rounded-lg border border-border bg-muted/30 p-3 text-xs'>
					<summary className='cursor-pointer text-muted-foreground'>Prompt template</summary>
					<pre className='mt-2 whitespace-pre-wrap font-mono'>{run.promptText}</pre>
				</details>
			</header>

			<section className='space-y-3'>
				<h2 className='text-lg font-medium'>Results</h2>
				{results.length === 0 ? (
					<p className='text-sm text-muted-foreground'>No results yet.</p>
				) : (
					<div className='overflow-x-auto rounded-lg border border-border'>
						<table className='w-full text-sm'>
							<thead className='bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground'>
								<tr>
									<th className='px-4 py-2'>Pass</th>
									<th className='px-4 py-2'>Src</th>
									<th className='px-4 py-2'>Input</th>
									<th className='px-4 py-2'>Expected</th>
									<th className='px-4 py-2'>Output</th>
									<th className='px-4 py-2'>Score</th>
									<th className='px-4 py-2'>Cost</th>
									<th className='px-4 py-2'>Latency</th>
								</tr>
							</thead>
							<tbody>
								{results.map((r) => {
									const score =
										r.scores.length > 0
											? r.scores.reduce((s, x) => s + x.value, 0) / r.scores.length
											: 0
									return (
										<tr key={r.id} className='border-t border-border align-top'>
											<td className='px-4 py-3 text-base'>
												{r.passed ? (
													<span className='text-green-600 dark:text-green-400'>✓</span>
												) : (
													<span className='text-red-600 dark:text-red-400'>✗</span>
												)}
											</td>
											<td className='px-4 py-3'>
												<SourceBadge source={r.source} />
											</td>
											<td className='px-4 py-3 max-w-xs'>
												<div className='truncate' title={r.input}>
													{r.input}
												</div>
											</td>
											<td className='px-4 py-3 font-mono text-xs text-muted-foreground'>
												{r.expected ?? '—'}
											</td>
											<td className='px-4 py-3 font-mono text-xs'>
												{r.errorMessage ? (
													<span className='text-red-600 dark:text-red-400'>
														{r.errorMessage}
													</span>
												) : (
													(r.output ?? '—')
												)}
											</td>
											<td className='px-4 py-3'>
												<ScoreBar value={score} />
												{r.scores
													.filter((s) => !s.passed && s.reason)
													.map((s, i) => (
														<div
															key={i}
															className='mt-1 text-xs text-muted-foreground'
														>
															{s.scorer}: {s.reason}
														</div>
													))}
											</td>
											<td className='px-4 py-3'>
												<CostCell cents={r.costCents} />
											</td>
											<td className='px-4 py-3 tabular-nums text-muted-foreground'>
												{formatLatency(r.latencyMs)}
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
