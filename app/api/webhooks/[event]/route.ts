import { NextResponse } from 'next/server'
import { z } from 'zod'
import { setWebhook } from '@/lib/db/queries'
import { WEBHOOK_EVENTS, type WebhookEvent } from '@/lib/db/schema'
import { apiError, fromUnknown, fromZod } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
	url: z.string().url().nullable(),
	enabled: z.boolean(),
	secret: z.string().min(8).nullable().optional(),
})

type Params = Promise<{ event: string }>

function isSupportedEvent(value: string): value is WebhookEvent {
	return (WEBHOOK_EVENTS as readonly string[]).includes(value)
}

export async function PUT(request: Request, { params }: { params: Params }) {
	const { event } = await params
	if (!isSupportedEvent(event)) {
		return apiError(
			`event must be one of: ${WEBHOOK_EVENTS.join(', ')}`,
			'invalid_request',
			400,
		)
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return apiError('body must be valid JSON', 'invalid_request', 400)
	}
	const parsed = BodySchema.safeParse(body)
	if (!parsed.success) return fromZod(parsed.error)

	try {
		const row = await setWebhook({
			event,
			url: parsed.data.url,
			enabled: parsed.data.enabled,
			secret: parsed.data.secret ?? null,
		})
		return NextResponse.json({ webhook: row })
	} catch (err) {
		return fromUnknown(err)
	}
}
