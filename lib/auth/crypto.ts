import { CompactEncrypt, compactDecrypt } from 'jose'

const ENC_ALG = 'A256GCM'
const KEY_ALG = 'dir'

export function getKey(): Uint8Array {
	const secret = process.env.SESSION_SECRET
	if (!secret || secret.length < 32) {
		throw new Error(
			'SESSION_SECRET env var must be set to a >=32-char string. Generate one with `openssl rand -hex 32`.',
		)
	}
	const bytes = new TextEncoder().encode(secret)
	if (bytes.length >= 32) return bytes.slice(0, 32)
	const padded = new Uint8Array(32)
	padded.set(bytes)
	return padded
}

export async function encryptValue(value: unknown): Promise<string> {
	const plaintext = new TextEncoder().encode(JSON.stringify(value))
	return new CompactEncrypt(plaintext)
		.setProtectedHeader({ alg: KEY_ALG, enc: ENC_ALG })
		.encrypt(getKey())
}

export async function decryptValue<T>(jwe: string): Promise<T | null> {
	try {
		const { plaintext } = await compactDecrypt(jwe, getKey())
		return JSON.parse(new TextDecoder().decode(plaintext)) as T
	} catch {
		return null
	}
}
