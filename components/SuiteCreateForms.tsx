'use client'

import { useActionState, useState } from 'react'
import {
	createSuiteManualAction,
	importSuiteFromFileAction,
	type CreateFormState,
} from '@/app/(dash)/suites/new/actions'

type Mode = 'manual' | 'import'

export function SuiteCreateForms() {
	const [mode, setMode] = useState<Mode>('manual')

	return (
		<div className='space-y-6'>
			<div className='inline-flex rounded-lg border border-border bg-muted/30 p-1 text-sm'>
				<TabButton current={mode} value='manual' onSelect={setMode}>
					Manual
				</TabButton>
				<TabButton current={mode} value='import' onSelect={setMode}>
					Import from file
				</TabButton>
			</div>
			{mode === 'manual' ? <ManualForm /> : <ImportForm />}
		</div>
	)
}

function TabButton({
	current,
	value,
	onSelect,
	children,
}: {
	current: Mode
	value: Mode
	onSelect: (m: Mode) => void
	children: React.ReactNode
}) {
	const active = current === value
	return (
		<button
			type='button'
			onClick={() => onSelect(value)}
			className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
				active ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
			}`}
		>
			{children}
		</button>
	)
}

function ManualForm() {
	const [state, action, isPending] = useActionState<CreateFormState | null, FormData>(
		createSuiteManualAction,
		null,
	)
	return (
		<form action={action} className='space-y-5'>
			<Field
				label='Name'
				hint='Lowercase, alphanumeric, with dashes / dots / underscores. Used in URLs (/suites/<name>).'
			>
				<input
					type='text'
					name='name'
					required
					placeholder='my-suite'
					pattern='[a-zA-Z0-9][a-zA-Z0-9._-]*'
					className='block w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm'
				/>
			</Field>
			<Field
				label='Description (optional)'
				hint='Shown on the suite page and the leaderboard.'
			>
				<textarea
					name='description'
					rows={3}
					placeholder='Short description of what this suite measures.'
					className='block w-full rounded border border-border bg-background px-3 py-2 text-sm'
				/>
			</Field>
			<Field label='Tags (optional, comma-separated)'>
				<input
					type='text'
					name='tags'
					placeholder='english, classification, easy'
					className='block w-full rounded border border-border bg-background px-3 py-2 text-sm'
				/>
			</Field>

			<div className='flex items-center gap-3 border-t border-border pt-4'>
				<button
					type='submit'
					disabled={isPending}
					className='inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50'
				>
					{isPending ? 'Creating…' : 'Create suite'}
				</button>
				<span className='text-xs text-muted-foreground'>
					Creates a metadata-only suite. Add cases later by importing or running.
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

function ImportForm() {
	const [state, action, isPending] = useActionState<CreateFormState | null, FormData>(
		importSuiteFromFileAction,
		null,
	)
	return (
		<form action={action} className='space-y-5'>
			<Field
				label='Suite definition file'
				hint={
					<>
						JSON shape:{' '}
						<code className='rounded bg-muted px-1'>
							&#123; name, description?, tags?, cases?: [&#123; input, expected?, tags?, metadata? &#125;] &#125;
						</code>
						. Up to 1 MB.{' '}
						<a
							href='/api/suites/template.json'
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
					accept='.json,application/json'
					required
					className='block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-sm file:font-medium file:text-background hover:file:opacity-90'
				/>
			</Field>

			<div className='rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground'>
				<p>
					<strong>Idempotent.</strong> Re-importing the same file updates description /
					tags and upserts cases by content hash without duplicating the case
					inventory. No runs or results are created.
				</p>
			</div>

			<div className='flex items-center gap-3 border-t border-border pt-4'>
				<button
					type='submit'
					disabled={isPending}
					className='inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50'
				>
					{isPending ? 'Importing…' : 'Import suite'}
				</button>
				<span className='text-xs text-muted-foreground'>Creates the suite + populates cases.</span>
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
