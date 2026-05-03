import type { WebhookEvent } from '@/lib/db/schema'

export type RunCompletedPayload = {
	event: 'run.completed'
	timestamp: string
	runId: number
	suiteName: string
	model: string
	passed: number
	total: number
	passRate: number
	costCents: number
	avgLatencyMs: number
	dashboardUrl: string | null
}

export type RegressionDetectedPayload = {
	event: 'regression.detected'
	timestamp: string
	runId: number
	suiteName: string
	model: string
	currentPassRate: number
	previousPassRate: number
	delta: number
	previousRunId: number
	dashboardUrl: string | null
}

export type WebhookPayloadFor<E extends WebhookEvent> = E extends 'run.completed'
	? RunCompletedPayload
	: E extends 'regression.detected'
		? RegressionDetectedPayload
		: never

export type AnyWebhookPayload = RunCompletedPayload | RegressionDetectedPayload
