'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createOrUpdateSuite, SuiteValidationError } from '@/lib/suites/create'

export type CreateFormState =
	| { ok: true }
	| { ok: false; error: string }

const MAX_BYTES = 1_000_000

export async function createSuiteManualAction(
	_prev: CreateFormState | null,
	formData: FormData,
): Promise<CreateFormState> {
	const name = (formData.get('name') as string | null)?.trim() ?? ''
	const description = (formData.get('description') as string | null)?.trim() ?? ''
	const tagsRaw = (formData.get('tags') as string | null)?.trim() ?? ''
	const tags = tagsRaw
		? tagsRaw
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean)
		: []

	if (!name) return { ok: false, error: 'Name is required.' }

	let createdName: string
	try {
		const result = await createOrUpdateSuite({
			name,
			description: description || null,
			tags,
		})
		createdName = result.name
	} catch (err) {
		if (err instanceof SuiteValidationError) return { ok: false, error: err.message }
		return { ok: false, error: err instanceof Error ? err.message : String(err) }
	}

	revalidatePath('/suites')
	redirect(`/suites/${encodeURIComponent(createdName)}?created=1`)
}

export async function importSuiteFromFileAction(
	_prev: CreateFormState | null,
	formData: FormData,
): Promise<CreateFormState> {
	const file = formData.get('file')
	if (!file || typeof file === 'string') return { ok: false, error: 'Upload a JSON file.' }
	const f = file as File
	if (f.size === 0) return { ok: false, error: 'File is empty.' }
	if (f.size > MAX_BYTES) {
		return {
			ok: false,
			error: `File is ${(f.size / 1024).toFixed(0)} KB; max is ${MAX_BYTES / 1024 / 1024} MB.`,
		}
	}

	let parsed: unknown
	try {
		parsed = JSON.parse(await f.text())
	} catch (err) {
		return {
			ok: false,
			error: `File is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
		}
	}

	let createdName: string
	try {
		const result = await createOrUpdateSuite(
			parsed as Parameters<typeof createOrUpdateSuite>[0],
		)
		createdName = result.name
	} catch (err) {
		if (err instanceof SuiteValidationError) return { ok: false, error: err.message }
		return { ok: false, error: err instanceof Error ? err.message : String(err) }
	}

	revalidatePath('/suites')
	redirect(`/suites/${encodeURIComponent(createdName)}?imported=1`)
}
