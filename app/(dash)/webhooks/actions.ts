'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { setWebhook } from '@/lib/db/queries'
import { dispatch } from '@/lib/webhooks/dispatch'
import { syntheticPayload } from '@/lib/webhooks/fixtures'
import { WEBHOOK_EVENTS, type WebhookEvent } from '@/lib/db/schema'

const SaveSchema = z.object({
	event: z.enum(WEBHOOK_EVENTS),
	url: z.string().trim().url().or(z.literal('')),
	enabled: z.coerce.boolean(),
	secret: z.string().trim().min(0).max(200).optional(),
})

export type SaveResult =
	| { ok: true }
	| { ok: false; error: string }

export async function saveWebhookAction(formData: FormData): Promise<SaveResult> {
	const parsed = SaveSchema.safeParse({
		event: formData.get('event'),
		url: formData.get('url') ?? '',
		enabled: formData.get('enabled') === 'on',
		secret: formData.get('secret') ?? '',
	})
	if (!parsed.success) {
		return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') }
	}
	try {
		await setWebhook({
			event: parsed.data.event,
			url: parsed.data.url || null,
			enabled: parsed.data.enabled,
			secret: parsed.data.secret ? parsed.data.secret : null,
		})
		revalidatePath('/webhooks')
		return { ok: true }
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : String(err) }
	}
}

export type TestResult =
	| { ok: true; statusCode: number | null; durationMs: number; succeeded: boolean; error: string | null }
	| { ok: false; error: string }

export async function testWebhookAction(event: WebhookEvent): Promise<TestResult> {
	const supportedEvents = WEBHOOK_EVENTS as readonly string[]
	if (!supportedEvents.includes(event)) {
		return { ok: false, error: `unknown event: ${event}` }
	}
	try {
		const payload = syntheticPayload(event, process.env.PUBLIC_DASHBOARD_URL ?? null)
		const out = await dispatch(event, payload, { force: true })
		if (out.skipped) {
			return {
				ok: false,
				error:
					out.skipped === 'no-config'
						? 'no webhook configured for this event yet — save a URL first'
						: out.skipped === 'no-url'
							? 'webhook has no URL set'
							: 'webhook is disabled',
			}
		}
		revalidatePath('/webhooks')
		return {
			ok: true,
			statusCode: out.delivery?.statusCode ?? null,
			durationMs: out.delivery?.durationMs ?? 0,
			succeeded: out.delivery?.succeeded ?? false,
			error: out.delivery?.errorMessage ?? null,
		}
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : String(err) }
	}
}
