import { listSuites } from '@/lib/db/queries'
import { PageHeader } from '@/components/PageHeader'
import { ErrorBlock } from '@/components/EmptyState'
import { ImportForm } from '@/components/ImportForm'

export const dynamic = 'force-dynamic'

export const metadata = {
	title: 'Import CSV · evalbench',
	description: 'Upload a CSV of eval results to backfill a run.',
}

export default async function ImportPage() {
	let suites: { name: string }[] = []
	let error: string | null = null
	try {
		const rows = await listSuites()
		suites = rows.map((s) => ({ name: s.name }))
	} catch (err) {
		error = err instanceof Error ? err.message : String(err)
	}

	return (
		<div className='mx-auto max-w-2xl space-y-6'>
			<PageHeader
				title='Import CSV'
				description={
					<>
						Upload a CSV of eval results to backfill a run. Same column shape as{' '}
						<code className='rounded bg-muted px-1'>/api/runs/&#123;id&#125;/export.csv</code>{' '}
						— round-trips natively. Imported rows are tagged{' '}
						<code className='rounded bg-muted px-1'>source=import</code> so they&apos;re
						distinguishable from app-generated runs.
					</>
				}
				actions={
					<a
						href='/api/import/template.csv'
						download
						className='inline-flex items-center gap-1.5 rounded border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted'
					>
						<svg
							width='14'
							height='14'
							viewBox='0 0 14 14'
							fill='none'
							aria-hidden='true'
						>
							<path
								d='M7 1.5v8m-3-3l3 3 3-3M2 12.5h10'
								stroke='currentColor'
								strokeWidth='1.5'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
						</svg>
						Template CSV
					</a>
				}
			/>

			{error ? (
				<ErrorBlock message={error} />
			) : (
				<div className='rounded-xl border border-border bg-card p-6'>
					<ImportForm suites={suites} />
				</div>
			)}

			<details className='rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground'>
				<summary className='cursor-pointer text-sm font-medium text-foreground'>
					CSV format reference
				</summary>
				<div className='mt-3 space-y-2'>
					<p>
						Header row required. Column names are case-insensitive. Required:{' '}
						<code className='rounded bg-background px-1'>input</code>. All other columns
						optional with sensible defaults.
					</p>
					<table className='mt-2 w-full border-collapse text-xs'>
						<thead>
							<tr className='text-left text-muted-foreground'>
								<th className='border-b border-border py-1.5 pr-3'>Column</th>
								<th className='border-b border-border py-1.5 pr-3'>Type</th>
								<th className='border-b border-border py-1.5'>Default</th>
							</tr>
						</thead>
						<tbody className='font-mono'>
							{[
								['input', 'string', '— (required)'],
								['expected', 'string', 'null'],
								['output', 'string', 'null'],
								['passed', 'true / false / 1 / 0', 'false'],
								['scores_json', 'JSON array', '[]'],
								['cost_cents', 'integer', '0'],
								['latency_ms', 'integer', '0'],
								['input_tokens', 'integer', '0'],
								['output_tokens', 'integer', '0'],
								['error_message', 'string', 'null'],
								['case_id', 'ignored', '—'],
							].map(([col, type, def]) => (
								<tr key={col}>
									<td className='border-b border-border/40 py-1.5 pr-3'>{col}</td>
									<td className='border-b border-border/40 py-1.5 pr-3 text-muted-foreground'>
										{type}
									</td>
									<td className='border-b border-border/40 py-1.5 text-muted-foreground'>
										{def}
									</td>
								</tr>
							))}
						</tbody>
					</table>
					<p className='mt-3'>
						Programmatic equivalent:{' '}
						<code className='rounded bg-background px-1'>
							curl -F file=@run.csv -F suite=… -F model=… /api/import
						</code>
					</p>
				</div>
			</details>
		</div>
	)
}
