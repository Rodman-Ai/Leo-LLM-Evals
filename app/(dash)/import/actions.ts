'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { importRunFromCsv, CsvImportError } from '@/lib/imports/run'

export type ImportFormState =
	| { ok: true }
	| { ok: false; error: string }

const MAX_BYTES = 4_000_000

export async function importCsvAction(
	_prev: ImportFormState | null,
	formData: FormData,
): Promise<ImportFormState> {
	const file = formData.get('file')
	const suite = (formData.get('suite_select') === '__new__'
		? formData.get('suite_new')
		: formData.get('suite_select')) as string | null
	const model = formData.get('model') as string | null
	const prompt = formData.get('prompt') as string | null
	const notes = formData.get('notes') as string | null

	if (!suite || !suite.trim()) return { ok: false, error: 'Pick a suite or enter a new one.' }
	if (!model || !model.trim()) return { ok: false, error: 'Model is required.' }
	if (!file || typeof file === 'string') return { ok: false, error: 'Upload a CSV file.' }
	const f = file as File
	if (f.size === 0) return { ok: false, error: 'File is empty.' }
	if (f.size > MAX_BYTES) {
		return {
			ok: false,
			error: `File is ${(f.size / 1024).toFixed(0)} KB; max is ${MAX_BYTES / 1024 / 1024} MB.`,
		}
	}

	let runId: number
	try {
		const csv = await f.text()
		const result = await importRunFromCsv({
			csv,
			suite: suite.trim(),
			model: model.trim(),
			prompt: prompt?.trim() || undefined,
			notes: notes?.trim() || undefined,
		})
		runId = result.runId
	} catch (err) {
		if (err instanceof CsvImportError) return { ok: false, error: err.message }
		return { ok: false, error: err instanceof Error ? err.message : String(err) }
	}

	revalidatePath('/runs')
	revalidatePath('/suites')
	redirect(`/runs/${runId}?imported=1`)
}
