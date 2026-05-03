import { NextResponse } from 'next/server'
import { dispatch } from '@/lib/webhooks/dispatch'
import { syntheticPayload } from '@/lib/webhooks/fixtures'
import { WEBHOOK_EVENTS, type WebhookEvent } from '@/lib/db/schema'
import { apiError, fromUnknown } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

type Params = Promise<{ event: string }>

function isSupportedEvent(value: string): value is WebhookEvent {
	return (WEBHOOK_EVENTS as readonly string[]).includes(value)
}

function dashboardOrigin(request: Request): string {
	const fromEnv = process.env.PUBLIC_DASHBOARD_URL ?? process.env.VERCEL_URL
	if (fromEnv) return fromEnv.startsWith('http') ? fromEnv : `https://${fromEnv}`
	return new URL(request.url).origin
}

/**
 * Fires a synthetic delivery using `lib/webhooks/fixtures.ts`. Intended
 * for the "Send test delivery" button — sets `force: true` so disabled
 * webhooks still send. Returns the recorded delivery so the UI can show
 * status code + duration immediately.
 */
export async function POST(request: Request, { params }: { params: Params }) {
	const { event } = await params
	if (!isSupportedEvent(event)) {
		return apiError(
			`event must be one of: ${WEBHOOK_EVENTS.join(', ')}`,
			'invalid_request',
			400,
		)
	}
	try {
		const payload = syntheticPayload(event, dashboardOrigin(request))
		const out = await dispatch(event, payload, { force: true })
		if (out.skipped) {
			return apiError(
				out.skipped === 'no-config'
					? 'no webhook configured for this event'
					: out.skipped === 'no-url'
						? 'webhook has no URL set'
						: 'webhook is disabled',
				out.skipped,
				400,
			)
		}
		return NextResponse.json({ delivery: out.delivery, payload })
	} catch (err) {
		return fromUnknown(err)
	}
}
