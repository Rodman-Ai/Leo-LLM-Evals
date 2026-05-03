import { createHmac, randomUUID } from 'node:crypto'
import { getWebhook, recordDelivery, type WebhookDeliveryRow } from '@/lib/db/queries'
import type { WebhookEvent } from '@/lib/db/schema'
import type { AnyWebhookPayload } from './types'

const TIMEOUT_MS = 5_000
const RETRY_BACKOFFS_MS = [1_000, 4_000, 16_000]

export type DispatchOptions = {
	/**
	 * If `true`, dispatch even when the webhook row is `enabled=false`. Used
	 * by the "Send test delivery" UI button.
	 */
	force?: boolean
}

export type DispatchOutcome = {
	delivered: boolean
	skipped?: 'no-config' | 'no-url' | 'disabled'
	delivery?: WebhookDeliveryRow
}

/**
 * Sends `payload` as a POST to the URL configured for `event`. Records
 * every attempt in `webhook_deliveries`. Retries on 5xx / network error
 * with exponential backoff (1s/4s/16s). 4xx is recorded and not retried.
 *
 * Never throws — outcomes are returned. Designed to be called as
 * fire-and-forget from `runSuite()`.
 */
export async function dispatch(
	event: WebhookEvent,
	payload: AnyWebhookPayload,
	opts: DispatchOptions = {},
): Promise<DispatchOutcome> {
	const config = await getWebhook(event)
	if (!config) return { delivered: false, skipped: 'no-config' }
	if (!config.url) return { delivered: false, skipped: 'no-url' }
	if (!config.enabled && !opts.force) return { delivered: false, skipped: 'disabled' }

	const body = JSON.stringify(payload)
	const deliveryId = randomUUID()
	const headers: Record<string, string> = {
		'content-type': 'application/json',
		'user-agent': 'evalbench-webhooks/1',
		'x-evalbench-event': event,
		'x-evalbench-delivery-id': deliveryId,
	}
	if (config.secret) {
		const sig = createHmac('sha256', config.secret).update(body).digest('hex')
		headers['x-evalbench-signature'] = `sha256=${sig}`
	}

	let lastErr: string | null = null
	let lastStatus: number | null = null
	let lastResponseBody: string | null = null
	let totalDuration = 0

	for (let attempt = 0; attempt <= RETRY_BACKOFFS_MS.length; attempt++) {
		const startedAt = Date.now()
		try {
			const ctrl = new AbortController()
			const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
			let res: Response
			try {
				res = await fetch(config.url, {
					method: 'POST',
					headers,
					body,
					signal: ctrl.signal,
				})
			} finally {
				clearTimeout(timer)
			}
			const elapsed = Date.now() - startedAt
			totalDuration += elapsed
			lastStatus = res.status
			lastResponseBody = await readBodyTruncated(res)
			lastErr = null
			if (res.ok) {
				const delivery = await recordDelivery({
					webhookId: config.id,
					event,
					payload,
					statusCode: res.status,
					responseBody: lastResponseBody,
					succeeded: true,
					errorMessage: null,
					durationMs: totalDuration,
				})
				return { delivered: true, delivery }
			}
			if (res.status < 500) {
				const delivery = await recordDelivery({
					webhookId: config.id,
					event,
					payload,
					statusCode: res.status,
					responseBody: lastResponseBody,
					succeeded: false,
					errorMessage: `HTTP ${res.status}`,
					durationMs: totalDuration,
				})
				return { delivered: false, delivery }
			}
		} catch (err) {
			totalDuration += Date.now() - startedAt
			lastErr = err instanceof Error ? err.message : String(err)
		}
		if (attempt < RETRY_BACKOFFS_MS.length) {
			await sleep(RETRY_BACKOFFS_MS[attempt])
		}
	}

	const delivery = await recordDelivery({
		webhookId: config.id,
		event,
		payload,
		statusCode: lastStatus,
		responseBody: lastResponseBody,
		succeeded: false,
		errorMessage: lastErr ?? `HTTP ${lastStatus ?? 'unknown'}`,
		durationMs: totalDuration,
	})
	return { delivered: false, delivery }
}

async function readBodyTruncated(res: Response): Promise<string | null> {
	try {
		const text = await res.text()
		return text.length > 2000 ? text.slice(0, 2000) + '…' : text
	} catch {
		return null
	}
}

function sleep(ms: number) {
	return new Promise<void>((r) => setTimeout(r, ms))
}
