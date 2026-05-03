import { NextResponse } from 'next/server'
import { importRunFromCsv, CsvImportError } from '@/lib/imports/run'
import { apiError, fromUnknown } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const MAX_BYTES = 4_000_000 // 4 MB — comfortably under Vercel Hobby's 4.5 MB

/**
 * Accepts a multipart upload of a CSV (matching the run-export format) plus
 * `suite`, `model`, and optional `prompt` / `notes` fields. Returns the new
 * runId on success.
 */
export async function POST(request: Request) {
	let form: FormData
	try {
		form = await request.formData()
	} catch (err) {
		return apiError(
			err instanceof Error ? err.message : 'invalid multipart body',
			'invalid_request',
			400,
		)
	}

	const fileEntry = form.get('file')
	const suite = formString(form.get('suite'))
	const model = formString(form.get('model'))
	const prompt = formString(form.get('prompt'))
	const notes = formString(form.get('notes'))

	if (!suite) return apiError('field "suite" is required', 'invalid_request', 400)
	if (!model) return apiError('field "model" is required', 'invalid_request', 400)
	if (!fileEntry || typeof fileEntry === 'string') {
		return apiError('field "file" must be a CSV file upload', 'invalid_request', 400)
	}
	const file = fileEntry as File
	if (file.size > MAX_BYTES) {
		return apiError(
			`file is ${file.size} bytes; max is ${MAX_BYTES}. Split the file or upgrade Vercel plan.`,
			'payload_too_large',
			413,
		)
	}

	try {
		const csv = await file.text()
		const result = await importRunFromCsv({
			csv,
			suite,
			model,
			prompt: prompt || undefined,
			notes: notes || undefined,
		})
		return NextResponse.json(result)
	} catch (err) {
		if (err instanceof CsvImportError) {
			return apiError(err.message, err.code, err.status)
		}
		return fromUnknown(err)
	}
}

function formString(value: FormDataEntryValue | null): string {
	if (typeof value !== 'string') return ''
	return value.trim()
}
