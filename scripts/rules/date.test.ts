import { Result } from 'effect'
import { describe, expect, test } from 'vitest'
import { normalizeRulesDate, RulesDateError } from './date'

describe('normalizeRulesDate', () => {
	test.each([
		{ case: 'preserves an ISO date', input: '2026-07-16', expected: '2026-07-16' },
		{ case: 'trims whitespace around an M/D/YYYY date', input: ' 7/6/2026 ', expected: '2026-07-06' },
		{ case: 'normalizes a named month date', input: 'October 9, 2026', expected: '2026-10-09' },
		{ case: 'accepts a valid leap day', input: '2/29/2024', expected: '2024-02-29' },
	])('$case', ({ input, expected }) => {
		expect(Result.getOrThrow(normalizeRulesDate(input))).toBe(expected)
	})

	test.each([
		{
			case: 'a whitespace-only value',
			input: '   ',
			message: 'Last Updated is missing',
			reason: 'missing',
		},
		{
			case: 'an unsupported slash order',
			input: '2026/07/16',
			message: 'Last Updated "2026/07/16" is not a recognized date',
			reason: 'unrecognized',
		},
		{
			case: 'an invalid non-leap date',
			input: '2025-02-29',
			message: 'Last Updated "2025-02-29" is not a valid date',
			reason: 'invalid',
		},
		{
			case: 'an invalid named month date',
			input: 'February 29, 2025',
			message: 'Last Updated "February 29, 2025" is not a valid date',
			reason: 'invalid',
		},
		{
			case: 'an invalid month',
			input: '13/1/2026',
			message: 'Last Updated "13/1/2026" is not a valid date',
			reason: 'invalid',
		},
	] as const)('rejects $case', ({ input, message, reason }) => {
		const result = normalizeRulesDate(input)

		expect(Result.isFailure(result)).toBe(true)
		if (Result.isSuccess(result)) throw new Error('Expected date normalization to fail')
		expect(result.failure).toBeInstanceOf(RulesDateError)
		expect(result.failure).toMatchObject({ label: 'Last Updated', value: input, reason, message })
	})

	test('includes the caller label in malformed-input errors', () => {
		const result = normalizeRulesDate('not-a-date', 'Tournament Rules date')

		expect(Result.isFailure(result)).toBe(true)
		if (Result.isSuccess(result)) throw new Error('Expected date normalization to fail')
		expect(result.failure).toMatchObject({
			label: 'Tournament Rules date',
			value: 'not-a-date',
			reason: 'unrecognized',
			message: 'Tournament Rules date "not-a-date" is not a recognized date',
		})
	})
})
