'use client'

import { useActionState, useState } from 'react'
import { importCsvAction, type ImportFormState } from '@/app/(dash)/import/actions'

export type SuiteOption = { name: string }

export function ImportForm({ suites }: { suites: SuiteOption[] }) {
	const [state, action, isPending] = useActionState<ImportFormState | null, FormData>(
		importCsvAction,
		null,
	)
	const [suiteSelect, setSuiteSelect] = useState(suites[0]?.name ?? '__new__')

	return (
		<form action={action} className='space-y-5'>
			<Field
				label='Suite'
				hint='Pick an existing suite or create a new one. Imported runs append to the suite they target.'
			>
				<select
					name='suite_select'
					value={suiteSelect}
					onChange={(e) => setSuiteSelect(e.target.value)}
					className='block w-full rounded border border-border bg-background px-3 py-2 text-sm'
				>
					{suites.map((s) => (
						<option key={s.name} value={s.name}>
							{s.name}
						</option>
					))}
					<option value='__new__'>+ Create new suite…</option>
				</select>
				{suiteSelect === '__new__' && (
					<input
						type='text'
						name='suite_new'
						placeholder='new-suite-name'
						required
						className='mt-2 block w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm'
					/>
				)}
			</Field>

			<Field
				label='Model'
				hint='Free-form. Convention: provider:model — e.g. anthropic:claude-haiku-4-5, openai:gpt-5, custom:my-finetune.'
			>
				<input
					type='text'
					name='model'
					placeholder='custom:my-model'
					required
					className='block w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm'
				/>
			</Field>

			<Field
				label='Prompt template (optional)'
				hint='Snapshotted to the run row for posterity. If left blank, the import timestamp is used.'
			>
				<textarea
					name='prompt'
					rows={3}
					placeholder='You are a helpful assistant. Answer concisely…'
					className='block w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm'
				/>
			</Field>

			<Field
				label='Notes (optional)'
				hint='Free-form note attached to the run row. Useful for "imported from internal eval Q3" or similar.'
			>
				<input
					type='text'
					name='notes'
					placeholder='Imported from internal Q3 eval'
					className='block w-full rounded border border-border bg-background px-3 py-2 text-sm'
				/>
			</Field>

			<Field
				label='CSV file'
				hint={
					<>
						Same column shape as{' '}
						<code className='rounded bg-muted px-1'>/api/runs/&#123;id&#125;/export.csv</code>.
						Required column: <code className='rounded bg-muted px-1'>input</code>. Up to 4 MB.{' '}
						<a
							href='/api/import/template.csv'
							download
							className='underline hover:text-foreground'
						>
							Download a template →
						</a>
					</>
				}
			>
				<input
					type='file'
					name='file'
					accept='.csv,text/csv'
					required
					className='block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-sm file:font-medium file:text-background hover:file:opacity-90'
				/>
			</Field>

			<div className='flex items-center gap-3 border-t border-border pt-4'>
				<button
					type='submit'
					disabled={isPending}
					className='inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50'
				>
					{isPending ? 'Importing…' : 'Import CSV'}
				</button>
				<span className='text-xs text-muted-foreground'>
					Becomes a new run with <code className='rounded bg-muted px-1'>source=import</code>.
				</span>
			</div>

			{state && !state.ok && (
				<p className='rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300'>
					{state.error}
				</p>
			)}
		</form>
	)
}

function Field({
	label,
	hint,
	children,
}: {
	label: string
	hint?: React.ReactNode
	children: React.ReactNode
}) {
	return (
		<label className='block space-y-1'>
			<span className='block text-sm font-medium'>{label}</span>
			{children}
			{hint && <span className='block text-xs text-muted-foreground'>{hint}</span>}
		</label>
	)
}
