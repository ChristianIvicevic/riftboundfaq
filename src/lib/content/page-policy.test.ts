import { describe, expect, test } from 'vitest'
import { shouldShowSourceDetails } from '@/lib/content/page-policy'

describe('shouldShowSourceDetails', () => {
	test.each([
		{ case: 'the reference index', path: '/reference', expected: false },
		{ case: 'a current reference document', path: '/reference/core-rules', expected: false },
		{ case: 'a reference change page', path: '/reference/core-rules/changes/1.4', expected: false },
		{ case: 'a ruling page', path: '/cards/ahri', expected: true },
		{ case: 'a similarly prefixed route', path: '/reference-card', expected: true },
	])('returns $expected for $case', ({ path, expected }) => {
		expect(shouldShowSourceDetails(path)).toBe(expected)
	})
})
