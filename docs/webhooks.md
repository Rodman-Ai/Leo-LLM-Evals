# Webhooks

Outgoing HTTP notifications fired when interesting things happen during a
run. Configure them at [`/webhooks`](#configuration-ui) on the deployed app
and use **Send test delivery** to verify your endpoint receives the payload
without waiting for a real eval.

## Events

### `run.completed`

Fires inside `runSuite()` after the run row is finalized, **except** when
`triggered_by IN ('seed','api-seed')` (so the demo seed endpoint doesn't
spam your URL).

```jsonc
{
  "event": "run.completed",
  "timestamp": "2026-05-04T10:30:00.000Z",
  "runId": 1234,
  "suiteName": "code-review",
  "model": "anthropic:claude-haiku-4-5",
  "passed": 47,
  "total": 53,
  "passRate": 0.8867924528301887,
  "costCents": 255,
  "avgLatencyMs": 642,
  "dashboardUrl": "https://your-host.vercel.app/runs/1234"
}
```

### `regression.detected`

Fires immediately after `run.completed` when the just-completed run's
pass rate is *lower* than the most recent prior `complete` run for the
same `(suite, model)` pair. If there's no prior run, or pass rates are
equal/higher, this event does not fire.

```jsonc
{
  "event": "regression.detected",
  "timestamp": "2026-05-04T10:30:00.000Z",
  "runId": 1234,
  "suiteName": "code-review",
  "model": "anthropic:claude-haiku-4-5",
  "currentPassRate": 0.7547169811320755,
  "previousPassRate": 0.8867924528301887,
  "delta": -0.1320754716981132,
  "previousRunId": 1230,
  "dashboardUrl": "https://your-host.vercel.app/compare?a=1230&b=1234"
}
```

`delta` is `currentPassRate - previousPassRate`, so always negative when
this event fires.

## Delivery contract

- **Method**: `POST`
- **Body**: `Content-Type: application/json`, the event payload above.
- **Headers**:
  - `User-Agent: evalbench-webhooks/1`
  - `X-Evalbench-Event: <event-name>`
  - `X-Evalbench-Delivery-Id: <uuid>` — unique per delivery; safe for
    idempotency keys.
  - `X-Evalbench-Signature: sha256=<hex>` — present when the webhook has a
    `secret` configured. HMAC-SHA256 over the raw request body.
- **Timeout**: 5 seconds per attempt.
- **Retries**: 3 retries on 5xx / network error with backoff `1s / 4s / 16s`.
  4xx responses are recorded and not retried (treated as the receiver's
  decision).
- **Recording**: Every attempt — success or failure — is persisted in
  `webhook_deliveries`. Visible in `/webhooks` UI and queryable via
  `GET /api/webhooks/{event}/deliveries`.
- **Concurrency**: Fire-and-forget from the runner (`Promise.allSettled`),
  so webhook delivery never blocks run completion.

## Verifying signatures

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

function verify(rawBody: string, header: string | null, secret: string): boolean {
  if (!header?.startsWith('sha256=')) return false
  const provided = Buffer.from(header.slice('sha256='.length), 'hex')
  const expected = Buffer.from(
    createHmac('sha256', secret).update(rawBody).digest(),
  )
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}
```

Note: verification needs the **raw** request body, not a JSON-parsed
representation. In Next.js route handlers, read with `await request.text()`
*before* parsing.

## Configuration UI

Open `/webhooks` on the deployed app. Each event has its own card:

- **URL** — full `https://...` URL of your receiver. Leave blank to clear.
- **Secret** — optional ≥8-char string used for HMAC signing.
- **Enabled** — when off, real runs skip this webhook (you can still test).
- **Save** — persists via Server Action.
- **Send test delivery** — fires a synthetic payload using
  [`lib/webhooks/fixtures.ts`](../lib/webhooks/fixtures.ts). The payload is
  representative of a real delivery so you can sanity-check formatting in
  Slack / Discord / your bug tracker. Disabled webhooks still send when
  testing.
- **Recent deliveries** — last 5 attempts with status code, duration, and
  error message.

## API equivalents

Everything the UI does is also available over HTTP — see
[api.md](./api.md).

| What             | UI button                | API call                                                    |
| ---------------- | ------------------------ | ----------------------------------------------------------- |
| List configs     | Page load                | `GET /api/webhooks`                                         |
| Save URL         | Save                     | `PUT /api/webhooks/{event}` with `{url, enabled, secret?}`  |
| Send test        | Send test delivery       | `POST /api/webhooks/{event}/test`                           |
| Delivery history | Recent deliveries        | `GET /api/webhooks/{event}/deliveries`                      |

## Choosing a receiver for testing

- **https://webhook.site** — Free, instant unique URL. Shows full headers
  + body in a browser. Best for first-time setup.
- **https://hookbin.com**, **https://requestbin.com** — Similar.
- **Slack incoming webhooks** — Real Slack integration; payload format
  needs a transform (Slack expects `{text, blocks}`). For a portfolio
  demo, prefer webhook.site.

## Demo mode

Webhook config is **not** disabled in `PUBLIC_DEMO_MODE` — the entire
feature is the demo, and URLs are user-supplied + pointed at user-owned
inboxes. The `triggered_by` check still skips webhooks for seeded runs,
so the seed endpoint won't spam your URL with 12 deliveries.

## Where webhooks are fired

Single call site in `lib/eval/runner.ts`:

```ts
if (ctx) {
  await finalizeRun(ctx.runId, 'complete')
  await fireWebhooks(ctx, summary, opts.triggeredBy ?? 'cli')
}
```

`fireWebhooks` is non-throwing — failures are recorded but never bubble
up to fail the run.

## Storage

Two tables added in migration `0002_*.sql`:

- `webhooks` — one row per event type, holding URL / enabled / secret.
- `webhook_deliveries` — one row per attempt with status, duration, body.
  FK-cascaded to `webhooks`. Indexed by `(webhook_id, attempted_at)` for
  the recent-deliveries query.

See [database.md](./database.md) for the schema reference.
