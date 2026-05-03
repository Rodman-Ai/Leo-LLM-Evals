import { describe, expect, it } from 'vitest'
import { safeFilename, toCsv } from '@/lib/exports/csv'

describe('toCsv', () => {
	it('emits headers + rows', () => {
		expect(toCsv(['a', 'b'], [[1, 2], [3, 4]])).toBe('a,b\n1,2\n3,4\n')
	})

	it('quotes values containing commas, quotes, or newlines', () => {
		expect(toCsv(['a'], [['x,y'], ['x"y'], ['x\ny']])).toBe(
			'a\n"x,y"\n"x""y"\n"x\ny"\n',
		)
	})

	it('renders booleans, nulls, and non-finite numbers safely', () => {
		expect(toCsv(['x'], [[true], [false], [null], [undefined], [NaN], [Infinity]])).toBe(
			'x\ntrue\nfalse\n\n\n\n\n',
		)
	})
})

describe('safeFilename', () => {
	it('joins parts with _ after sanitizing', () => {
		expect(safeFilename('run', '12', 'anthropic:claude-haiku-4-5')).toBe(
			'run_12_anthropic-claude-haiku-4-5',
		)
	})
	it('drops empty parts', () => {
		expect(safeFilename('a', '', '  ', 'b')).toBe('a_b')
	})
})
