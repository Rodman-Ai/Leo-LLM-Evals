import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db/queries', () => ({
	getWebhook: vi.fn(),
	recordDelivery: vi.fn(async (input) => ({ id: 1, ...input, attemptedAt: new Date() })),
}))

import { dispatch } from '@/lib/webhooks/dispatch'
import { getWebhook, recordDelivery } from '@/lib/db/queries'
import { syntheticPayload } from '@/lib/webhooks/fixtures'

const mockedGetWebhook = vi.mocked(getWebhook)
const mockedRecordDelivery = vi.mocked(recordDelivery)
const fetchMock = vi.fn()

beforeEach(() => {
	mockedGetWebhook.mockReset()
	mockedRecordDelivery.mockClear()
	fetchMock.mockReset()
	vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
	vi.unstubAllGlobals()
})

const payload = syntheticPayload('run.completed', null)

describe('dispatch', () => {
	it('skips when no webhook row exists', async () => {
		mockedGetWebhook.mockResolvedValueOnce(null)
		const out = await dispatch('run.completed', payload)
		expect(out.delivered).toBe(false)
		expect(out.skipped).toBe('no-config')
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('skips when URL is empty', async () => {
		mockedGetWebhook.mockResolvedValueOnce(webhook({ url: null, enabled: true }))
		const out = await dispatch('run.completed', payload)
		expect(out.skipped).toBe('no-url')
	})

	it('skips when disabled', async () => {
		mockedGetWebhook.mockResolvedValueOnce(webhook({ url: 'https://x.test', enabled: false }))
		const out = await dispatch('run.completed', payload)
		expect(out.skipped).toBe('disabled')
	})

	it('force=true overrides disabled', async () => {
		mockedGetWebhook.mockResolvedValueOnce(webhook({ url: 'https://x.test', enabled: false }))
		fetchMock.mockResolvedValueOnce(okResponse())
		const out = await dispatch('run.completed', payload, { force: true })
		expect(out.delivered).toBe(true)
		expect(fetchMock).toHaveBeenCalledOnce()
	})

	it('signs the body when secret is set', async () => {
		mockedGetWebhook.mockResolvedValueOnce(
			webhook({ url: 'https://x.test', enabled: true, secret: 'hunter2' }),
		)
		fetchMock.mockResolvedValueOnce(okResponse())
		await dispatch('run.completed', payload)
		const init = fetchMock.mock.calls[0][1] as RequestInit
		const headers = init.headers as Record<string, string>
		expect(headers['x-evalbench-signature']).toMatch(/^sha256=[0-9a-f]{64}$/)
		expect(headers['x-evalbench-event']).toBe('run.completed')
		expect(headers['x-evalbench-delivery-id']).toMatch(/^[0-9a-f-]{36}$/)
	})

	it('records success on 2xx', async () => {
		mockedGetWebhook.mockResolvedValueOnce(webhook({ url: 'https://x.test', enabled: true }))
		fetchMock.mockResolvedValueOnce(okResponse('ok'))
		const out = await dispatch('run.completed', payload)
		expect(out.delivered).toBe(true)
		expect(mockedRecordDelivery).toHaveBeenCalledOnce()
		const args = mockedRecordDelivery.mock.calls[0][0]
		expect(args.succeeded).toBe(true)
		expect(args.statusCode).toBe(200)
	})

	it('does not retry on 4xx, records failure once', async () => {
		mockedGetWebhook.mockResolvedValueOnce(webhook({ url: 'https://x.test', enabled: true }))
		fetchMock.mockResolvedValueOnce(httpResponse(404, 'not found'))
		const out = await dispatch('run.completed', payload)
		expect(out.delivered).toBe(false)
		expect(fetchMock).toHaveBeenCalledOnce()
		expect(mockedRecordDelivery).toHaveBeenCalledOnce()
		expect(mockedRecordDelivery.mock.calls[0][0].statusCode).toBe(404)
	})

	it('retries on 5xx then succeeds', async () => {
		vi.useFakeTimers()
		mockedGetWebhook.mockResolvedValueOnce(webhook({ url: 'https://x.test', enabled: true }))
		fetchMock
			.mockResolvedValueOnce(httpResponse(503, 'down'))
			.mockResolvedValueOnce(okResponse('ok'))
		const promise = dispatch('run.completed', payload)
		await vi.advanceTimersByTimeAsync(1_000)
		const out = await promise
		expect(out.delivered).toBe(true)
		expect(fetchMock).toHaveBeenCalledTimes(2)
		expect(mockedRecordDelivery).toHaveBeenCalledOnce()
		vi.useRealTimers()
	})

	it('records failure after exhausting retries', async () => {
		vi.useFakeTimers()
		mockedGetWebhook.mockResolvedValueOnce(webhook({ url: 'https://x.test', enabled: true }))
		fetchMock.mockResolvedValue(httpResponse(500, 'oops'))
		const promise = dispatch('run.completed', payload)
		await vi.advanceTimersByTimeAsync(1_000 + 4_000 + 16_000)
		const out = await promise
		expect(out.delivered).toBe(false)
		expect(fetchMock).toHaveBeenCalledTimes(4)
		expect(mockedRecordDelivery).toHaveBeenCalledOnce()
		expect(mockedRecordDelivery.mock.calls[0][0].succeeded).toBe(false)
		vi.useRealTimers()
	})
})

function webhook(over: Partial<{ url: string | null; enabled: boolean; secret: string | null }>) {
	return {
		id: 7,
		event: 'run.completed',
		url: 'https://x.test',
		enabled: true,
		secret: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...over,
	}
}

function okResponse(body = '') {
	return httpResponse(200, body)
}

function httpResponse(status: number, body: string): Response {
	return new Response(body, { status, statusText: status === 200 ? 'OK' : 'X' })
}
