'use client'

import { useState, useTransition } from 'react'
import {
	saveWebhookAction,
	testWebhookAction,
	type SaveResult,
	type TestResult,
} from '@/app/(dash)/webhooks/actions'
import type { WebhookEvent } from '@/lib/db/schema'
import { formatDate } from '@/lib/format'

export type DeliveryRow = {
	id: number
	statusCode: number | null
	succeeded: boolean
	durationMs: number | null
	errorMessage: string | null
	attemptedAt: Date
}

export type WebhookCardProps = {
	event: WebhookEvent
	url: string | null
	enabled: boolean
	secret: string | null
	deliveries: DeliveryRow[]
	updatedAt: Date | null
}

const EVENT_LABELS: Record<WebhookEvent, { title: string; description: string }> = {
	'run.completed': {
		title: 'run.completed',
		description: 'Fires after every successful run completion.',
	},
	'regression.detected': {
		title: 'regression.detected',
		description:
			'Fires when a run\'s pass rate drops vs. the previous complete run for the same suite + model.',
	},
}

export function WebhookCard(props: WebhookCardProps) {
	const labels = EVENT_LABELS[props.event]
	const [isSaving, startSave] = useTransition()
	const [isTesting, startTest] = useTransition()
	const [saveResult, setSaveResult] = useState<SaveResult | null>(null)
	const [testResult, setTestResult] = useState<TestResult | null>(null)

	function onSave(formData: FormData) {
		formData.set('event', props.event)
		startSave(async () => {
			setSaveResult(null)
			setTestResult(null)
			const result = await saveWebhookAction(formData)
			setSaveResult(result)
		})
	}

	function onTest() {
		startTest(async () => {
			setTestResult(null)
			const result = await testWebhookAction(props.event)
			setTestResult(result)
		})
	}

	return (
		<section className='rounded-lg border border-border bg-card p-5'>
			<header className='mb-4'>
				<h2 className='font-mono text-sm font-semibold'>{labels.title}</h2>
				<p className='mt-1 text-sm text-muted-foreground'>{labels.description}</p>
			</header>

			<form action={onSave} className='space-y-3'>
				<div className='space-y-1'>
					<label className='block text-xs font-medium text-muted-foreground'>URL</label>
					<input
						type='url'
						name='url'
						defaultValue={props.url ?? ''}
						placeholder='https://hooks.slack.com/services/...'
						className='w-full rounded border border-border bg-background px-3 py-1.5 text-sm font-mono'
					/>
				</div>
				<div className='space-y-1'>
					<label className='block text-xs font-medium text-muted-foreground'>
						Secret (optional, ≥8 chars — used for X-Evalbench-Signature)
					</label>
					<input
						type='text'
						name='secret'
						defaultValue={props.secret ?? ''}
						placeholder='leave blank to skip HMAC signing'
						className='w-full rounded border border-border bg-background px-3 py-1.5 text-sm font-mono'
					/>
				</div>
				<label className='inline-flex items-center gap-2 text-sm'>
					<input
						type='checkbox'
						name='enabled'
						defaultChecked={props.enabled}
						className='h-4 w-4'
					/>
					<span>Enabled — fire on real runs</span>
				</label>
				<div className='flex items-center gap-3'>
					<button
						type='submit'
						disabled={isSaving}
						className='rounded border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50'
					>
						{isSaving ? 'Saving…' : 'Save'}
					</button>
					<button
						type='button'
						onClick={onTest}
						disabled={isTesting}
						className='rounded border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50'
					>
						{isTesting ? 'Sending…' : 'Send test delivery'}
					</button>
					{props.updatedAt && (
						<span className='ml-auto text-xs text-muted-foreground'>
							saved {formatDate(props.updatedAt)}
						</span>
					)}
				</div>

				{saveResult && (
					<p
						className={`text-xs ${saveResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
					>
						{saveResult.ok ? '✓ saved' : `✗ ${saveResult.error}`}
					</p>
				)}
				{testResult && <TestResultLine result={testResult} />}
			</form>

			<div className='mt-5'>
				<h3 className='text-xs uppercase tracking-wide text-muted-foreground'>
					Recent deliveries
				</h3>
				{props.deliveries.length === 0 ? (
					<p className='mt-2 text-xs text-muted-foreground'>
						No deliveries yet. Press &ldquo;Send test delivery&rdquo; to fire one.
					</p>
				) : (
					<table className='mt-2 w-full text-xs'>
						<tbody>
							{props.deliveries.map((d) => (
								<tr key={d.id} className='border-t border-border'>
									<td className='py-1.5 pr-3'>
										{d.succeeded ? (
											<span className='text-green-600 dark:text-green-400'>✓</span>
										) : (
											<span className='text-red-600 dark:text-red-400'>✗</span>
										)}
									</td>
									<td className='py-1.5 pr-3 font-mono'>{d.statusCode ?? '—'}</td>
									<td className='py-1.5 pr-3 tabular-nums text-muted-foreground'>
										{d.durationMs ? `${d.durationMs}ms` : '—'}
									</td>
									<td className='py-1.5 pr-3 text-muted-foreground'>
										{formatDate(d.attemptedAt)}
									</td>
									<td className='py-1.5 text-muted-foreground'>{d.errorMessage ?? ''}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</section>
	)
}

function TestResultLine({ result }: { result: TestResult }) {
	if (!result.ok) {
		return <p className='text-xs text-red-600 dark:text-red-400'>✗ {result.error}</p>
	}
	const colour = result.succeeded
		? 'text-green-600 dark:text-green-400'
		: 'text-red-600 dark:text-red-400'
	return (
		<p className={`text-xs ${colour}`}>
			{result.succeeded ? '✓' : '✗'} HTTP {result.statusCode ?? '—'} · {result.durationMs}ms
			{result.error ? ` · ${result.error}` : ''}
		</p>
	)
}
