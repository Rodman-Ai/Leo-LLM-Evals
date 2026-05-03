import { NextResponse } from 'next/server'
import { z } from 'zod'
import { listDeliveries } from '@/lib/db/queries'
import { WEBHOOK_EVENTS, type WebhookEvent } from '@/lib/db/schema'
import { apiError, fromUnknown, fromZod } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

const QuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).optional(),
})

type Params = Promise<{ event: string }>

function isSupportedEvent(value: string): value is WebhookEvent {
	return (WEBHOOK_EVENTS as readonly string[]).includes(value)
}

export async function GET(request: Request, { params }: { params: Params }) {
	const { event } = await params
	if (!isSupportedEvent(event)) {
		return apiError(
			`event must be one of: ${WEBHOOK_EVENTS.join(', ')}`,
			'invalid_request',
			400,
		)
	}
	const url = new URL(request.url)
	const parsed = QuerySchema.safeParse({ limit: url.searchParams.get('limit') ?? undefined })
	if (!parsed.success) return fromZod(parsed.error)

	try {
		const deliveries = await listDeliveries({ event, limit: parsed.data.limit ?? 20 })
		return NextResponse.json({ deliveries })
	} catch (err) {
		return fromUnknown(err)
	}
}
