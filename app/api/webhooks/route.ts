import { NextResponse } from 'next/server'
import { getWebhooks } from '@/lib/db/queries'
import { WEBHOOK_EVENTS } from '@/lib/db/schema'
import { fromUnknown } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

export async function GET() {
	try {
		const rows = await getWebhooks()
		const byEvent = new Map(rows.map((r) => [r.event, r]))
		const webhooks = WEBHOOK_EVENTS.map(
			(event) =>
				byEvent.get(event) ?? {
					id: null,
					event,
					url: null,
					enabled: false,
					secret: null,
					createdAt: null,
					updatedAt: null,
				},
		)
		return NextResponse.json({ webhooks, supportedEvents: WEBHOOK_EVENTS })
	} catch (err) {
		return fromUnknown(err)
	}
}
