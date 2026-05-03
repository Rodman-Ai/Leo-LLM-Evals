import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'

export type ApiErrorBody = {
	error: string
	code: string
	details?: unknown
}

/**
 * Standard error envelope for `/api/*` responses. Keep `code` short and
 * stable (consumers may switch on it); put human-readable text in `error`.
 */
export function apiError(
	message: string,
	code: string,
	status: number,
	details?: unknown,
): NextResponse<ApiErrorBody> {
	return NextResponse.json({ error: message, code, details }, { status })
}

export function fromZod(err: ZodError): NextResponse<ApiErrorBody> {
	return apiError('invalid request', 'invalid_request', 400, err.flatten())
}

export function fromUnknown(err: unknown): NextResponse<ApiErrorBody> {
	const message = err instanceof Error ? err.message : String(err)
	return apiError(message, 'internal_error', 500)
}
