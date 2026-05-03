import { getWebhooks, listDeliveries } from '@/lib/db/queries'
import { WEBHOOK_EVENTS } from '@/lib/db/schema'
import { WebhookCard, type DeliveryRow } from '@/components/WebhookCard'

export const dynamic = 'force-dynamic'

export const metadata = {
	title: 'Webhooks · evalbench',
	description: 'Configure outgoing webhook URLs and send test deliveries.',
}

export default async function WebhooksPage() {
	let configs: Awaited<ReturnType<typeof getWebhooks>> = []
	let deliveriesByEvent = new Map<string, DeliveryRow[]>()
	let error: string | null = null
	try {
		configs = await getWebhooks()
		const all = await Promise.all(
			WEBHOOK_EVENTS.map(async (event) => {
				const rows = await listDeliveries({ event, limit: 5 })
				return [
					event,
					rows.map((r) => ({
						id: r.id,
						statusCode: r.statusCode,
						succeeded: r.succeeded,
						durationMs: r.durationMs,
						errorMessage: r.errorMessage,
						attemptedAt: r.attemptedAt,
					})),
				] as const
			}),
		)
		deliveriesByEvent = new Map(all)
	} catch (err) {
		error = err instanceof Error ? err.message : String(err)
	}

	const byEvent = new Map(configs.map((c) => [c.event, c]))

	return (
		<div className='space-y-6'>
			<header className='space-y-2'>
				<h1 className='text-3xl font-semibold tracking-tight'>Webhooks</h1>
				<p className='text-muted-foreground'>
					Outgoing notifications sent when interesting things happen during a run. Configure a
					URL, optionally add a secret for HMAC-SHA256 signing, and use{' '}
					<em>Send test delivery</em> to verify your endpoint receives the payload.
				</p>
				<p className='text-sm text-muted-foreground'>
					Looking for the API reference?{' '}
					<a href='/api-docs' className='underline'>
						Open Swagger →
					</a>
				</p>
			</header>

			{error ? (
				<div className='rounded-lg border border-border bg-muted/30 p-6 text-sm text-muted-foreground'>
					Database error: {error}
				</div>
			) : (
				<div className='grid gap-6 lg:grid-cols-2'>
					{WEBHOOK_EVENTS.map((event) => {
						const config = byEvent.get(event)
						return (
							<WebhookCard
								key={event}
								event={event}
								url={config?.url ?? null}
								enabled={config?.enabled ?? false}
								secret={config?.secret ?? null}
								updatedAt={config?.updatedAt ?? null}
								deliveries={deliveriesByEvent.get(event) ?? []}
							/>
						)
					})}
				</div>
			)}
		</div>
	)
}
