/**
 * RFC 4180 CSV writer. Header row + rows of typed cells. Strings are
 * quoted only when they contain a delimiter, quote, or newline. Quotes
 * inside quoted strings are doubled.
 */

export type Cell = string | number | boolean | null | undefined

export function toCsv(headers: string[], rows: Cell[][]): string {
	const lines = [headers.map(escape).join(',')]
	for (const row of rows) {
		lines.push(row.map(escape).join(','))
	}
	return lines.join('\n') + '\n'
}

function escape(value: Cell): string {
	if (value == null) return ''
	if (typeof value === 'boolean') return value ? 'true' : 'false'
	if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
	const s = String(value)
	if (/[",\n\r]/.test(s)) {
		return `"${s.replace(/"/g, '""')}"`
	}
	return s
}

/** Filename-safe slug. Unicode letters/digits/dash/underscore only. */
export function safeFilename(...parts: string[]): string {
	return parts
		.map((p) => p.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, ''))
		.filter(Boolean)
		.join('_')
}
