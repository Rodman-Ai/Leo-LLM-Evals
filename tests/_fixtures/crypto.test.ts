import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const ORIGINAL_SECRET = process.env.SESSION_SECRET

beforeEach(() => {
	process.env.SESSION_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
})

afterEach(() => {
	if (ORIGINAL_SECRET === undefined) {
		delete process.env.SESSION_SECRET
	} else {
		process.env.SESSION_SECRET = ORIGINAL_SECRET
	}
})

describe('encryptValue / decryptValue', () => {
	it('round-trips structured data', async () => {
		const { encryptValue, decryptValue } = await import('@/lib/auth/crypto')
		const value = { google: { accessToken: 'xyz', expiresAt: 1234567890, scope: 'a b' } }
		const jwe = await encryptValue(value)
		expect(jwe).toMatch(/^[\w-]+\.[\w-]*\.[\w-]+\.[\w-]+\.[\w-]+$/)
		const round = await decryptValue<typeof value>(jwe)
		expect(round).toEqual(value)
	})

	it('returns null on tampered ciphertext', async () => {
		const { encryptValue, decryptValue } = await import('@/lib/auth/crypto')
		const jwe = await encryptValue({ x: 1 })
		const tampered = jwe.slice(0, -2) + 'AA'
		expect(await decryptValue(tampered)).toBeNull()
	})

	it('returns null when secret has changed', async () => {
		const { encryptValue, decryptValue } = await import('@/lib/auth/crypto')
		const jwe = await encryptValue({ x: 1 })
		process.env.SESSION_SECRET = 'a-different-secret-value-but-still-32-or-more-chars-XX'
		expect(await decryptValue(jwe)).toBeNull()
	})

	it('throws when SESSION_SECRET is too short', async () => {
		const { encryptValue } = await import('@/lib/auth/crypto')
		process.env.SESSION_SECRET = 'too-short'
		await expect(encryptValue({})).rejects.toThrow(/SESSION_SECRET/)
	})
})
