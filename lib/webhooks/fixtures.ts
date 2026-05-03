import type { WebhookEvent } from '@/lib/db/schema'
import type { AnyWebhookPayload } from './types'

/**
 * Synthetic payloads used by the "Send test delivery" button. The numbers
 * are realistic — picked to look like a real run completing on the
 * code-review suite — so when the user pastes the test JSON into Slack
 * it's representative of what they'll see in production.
 */
export function syntheticPayload(event: WebhookEvent, dashboardUrl: string | null): AnyWebhookPayload {
	const now = new Date().toISOString()
	if (event === 'run.completed') {
		return {
			event: 'run.completed',
			timestamp: now,
			runId: 1234,
			suiteName: 'code-review',
			model: 'anthropic:claude-haiku-4-5',
			passed: 47,
			total: 53,
			passRate: 0.8867924528301887,
			costCents: 255,
			avgLatencyMs: 642,
			dashboardUrl: dashboardUrl ? `${dashboardUrl}/runs/1234` : null,
		}
	}
	return {
		event: 'regression.detected',
		timestamp: now,
		runId: 1234,
		suiteName: 'code-review',
		model: 'anthropic:claude-haiku-4-5',
		currentPassRate: 0.7547169811320755,
		previousPassRate: 0.8867924528301887,
		delta: -0.1320754716981132,
		previousRunId: 1230,
		dashboardUrl: dashboardUrl ? `${dashboardUrl}/compare?a=1230&b=1234` : null,
	}
}
