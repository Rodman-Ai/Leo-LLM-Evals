import { toCsv } from '@/lib/exports/csv'

/**
 * The accepted import format documented in docs/imports.md, rendered as a
 * downloadable CSV with three example rows. Re-uploadable as-is — gives
 * the user a working template they can edit cell-by-cell instead of
 * guessing column names from prose docs.
 */
export const TEMPLATE_HEADERS = [
	'case_id',
	'input',
	'expected',
	'output',
	'passed',
	'scores_json',
	'cost_cents',
	'latency_ms',
	'input_tokens',
	'output_tokens',
	'error_message',
] as const

export const TEMPLATE_FILENAME = 'evalbench-import-template.csv'

const SAMPLE_ROWS: (string | number | boolean)[][] = [
	[
		1,
		'What is the capital of France?',
		'paris',
		'paris',
		true,
		'[{"scorer":"exact","value":1,"passed":true}]',
		3,
		640,
		18,
		1,
		'',
	],
	[
		2,
		'Translate "hello" to Spanish.',
		'hola',
		'¡Hola!',
		false,
		'[{"scorer":"exact","value":0,"passed":false,"reason":"expected \\"hola\\", got \\"¡Hola!\\""}]',
		4,
		720,
		22,
		2,
		'',
	],
	[
		3,
		'Multi-line\ninput, with a comma',
		'',
		'response that contains "quotes" and a comma, plus a newline\nhere',
		true,
		'[]',
		5,
		830,
		30,
		8,
		'',
	],
]

export function buildTemplateCsv(): string {
	return toCsv([...TEMPLATE_HEADERS], SAMPLE_ROWS)
}
