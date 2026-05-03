/**
 * RFC 4180 CSV parser. Counterpart to lib/exports/csv.ts.
 *
 * Returns an array of records keyed by normalized header (lowercase,
 * non-alphanum collapsed to '_'). The first non-empty line is treated
 * as the header row.
 *
 * Handles:
 * - Quoted fields containing commas, quotes ("" → "), and embedded
 *   newlines.
 * - CRLF and bare LF line endings.
 * - Trailing newline (ignored) and blank lines (skipped).
 * - Optional UTF-8 BOM at the start of the file.
 */

export type CsvRecord = Record<string, string>

export type ParseResult = {
	headers: string[]
	rows: CsvRecord[]
}

export function parseCsv(input: string): ParseResult {
	const text = input.replace(/^﻿/, '')
	const cells = tokenize(text)
	if (cells.length === 0) return { headers: [], rows: [] }

	const headers = cells[0].map(normalizeHeader)
	const rows: CsvRecord[] = []
	for (let i = 1; i < cells.length; i++) {
		const row = cells[i]
		// Skip rows that are entirely empty (e.g. trailing blank line).
		if (row.length === 1 && row[0] === '') continue
		const record: CsvRecord = {}
		for (let j = 0; j < headers.length; j++) {
			record[headers[j]] = row[j] ?? ''
		}
		rows.push(record)
	}
	return { headers, rows }
}

export function normalizeHeader(s: string): string {
	return s
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
}

function tokenize(text: string): string[][] {
	const lines: string[][] = []
	let row: string[] = []
	let cell = ''
	let inQuotes = false
	let i = 0
	const len = text.length

	while (i < len) {
		const ch = text[i]
		if (inQuotes) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					cell += '"'
					i += 2
					continue
				}
				inQuotes = false
				i += 1
				continue
			}
			cell += ch
			i += 1
			continue
		}
		// Outside quotes
		if (ch === '"') {
			inQuotes = true
			i += 1
			continue
		}
		if (ch === ',') {
			row.push(cell)
			cell = ''
			i += 1
			continue
		}
		if (ch === '\r') {
			// Treat CR as part of CRLF; the LF will commit the row.
			i += 1
			continue
		}
		if (ch === '\n') {
			row.push(cell)
			lines.push(row)
			row = []
			cell = ''
			i += 1
			continue
		}
		cell += ch
		i += 1
	}
	// Final cell / row if no trailing newline.
	if (cell !== '' || row.length > 0) {
		row.push(cell)
		lines.push(row)
	}
	return lines
}
