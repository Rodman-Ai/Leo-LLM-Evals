import { describe, expect, it } from 'vitest'
import { normalizeHeader, parseCsv } from '@/lib/imports/csv'

describe('parseCsv', () => {
	it('parses a basic header + rows', () => {
		const out = parseCsv('a,b,c\n1,2,3\n4,5,6\n')
		expect(out.headers).toEqual(['a', 'b', 'c'])
		expect(out.rows).toEqual([
			{ a: '1', b: '2', c: '3' },
			{ a: '4', b: '5', c: '6' },
		])
	})

	it('handles quoted cells with commas, escaped quotes, and embedded newlines', () => {
		const csv = 'a,b\n"x,y","he said ""hi"""\n"line\n2",z\n'
		const out = parseCsv(csv)
		expect(out.rows).toEqual([
			{ a: 'x,y', b: 'he said "hi"' },
			{ a: 'line\n2', b: 'z' },
		])
	})

	it('treats empty cells as empty strings, not missing keys', () => {
		const out = parseCsv('a,b,c\n1,,3\n')
		expect(out.rows[0]).toEqual({ a: '1', b: '', c: '3' })
		expect('b' in out.rows[0]).toBe(true)
	})

	it('skips trailing blank lines', () => {
		const out = parseCsv('a\n1\n\n')
		expect(out.rows).toEqual([{ a: '1' }])
	})

	it('handles CRLF line endings', () => {
		const out = parseCsv('a,b\r\n1,2\r\n')
		expect(out.rows).toEqual([{ a: '1', b: '2' }])
	})

	it('strips a UTF-8 BOM if present', () => {
		const out = parseCsv('﻿a,b\n1,2\n')
		expect(out.headers).toEqual(['a', 'b'])
	})

	it('survives a row missing trailing cells (treats them as empty)', () => {
		const out = parseCsv('a,b,c\n1\n')
		expect(out.rows[0]).toEqual({ a: '1', b: '', c: '' })
	})
})

describe('normalizeHeader', () => {
	it.each([
		['Pass Rate', 'pass_rate'],
		['cost_cents', 'cost_cents'],
		['Input Tokens!', 'input_tokens'],
		['  case_id  ', 'case_id'],
		['__leading__', 'leading'],
	])('normalizes "%s" → "%s"', (input, expected) => {
		expect(normalizeHeader(input)).toBe(expected)
	})
})
