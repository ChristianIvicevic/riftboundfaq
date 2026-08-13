import { describe, expect, test } from 'vitest'
import { normalizeRulesDate } from './rules-date'

describe('normalizeRulesDate', () => {
	test.each([
		{ case: 'preserves an ISO date', input: '2026-07-16', expected: '2026-07-16' },
		{ case: 'trims whitespace around an M/D/YYYY date', input: ' 7/6/2026 ', expected: '2026-07-06' },
		{ case: 'accepts a valid leap day', input: '2/29/2024', expected: '2024-02-29' },
	])('$case', ({ input, expected }) => {
		expect(normalizeRulesDate(input)).toBe(expected)
	})

	test.each([
		{ case: 'a missing value', input: undefined, message: 'Last Updated is missing' },
		{ case: 'an empty string', input: '', message: 'Last Updated is missing' },
		{
			case: 'an unsupported slash order',
			input: '2026/07/16',
			message: 'Last Updated "2026/07/16" is not a recognized date',
		},
		{
			case: 'an invalid non-leap date',
			input: '2025-02-29',
			message: 'Last Updated "2025-02-29" is not a valid date',
		},
		{
			case: 'an invalid month',
			input: '13/1/2026',
			message: 'Last Updated "13/1/2026" is not a valid date',
		},
	])('rejects $case', ({ input, message }) => {
		expect(() => normalizeRulesDate(input)).toThrow(message)
	})

	test('includes the caller label in malformed-input errors', () => {
		expect(() => normalizeRulesDate('not-a-date', 'Tournament Rules date')).toThrow(
			'Tournament Rules date "not-a-date" is not a recognized date',
		)
	})
})
