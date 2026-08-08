import { describe, expect, test } from 'vitest'
import { getRulingPageKind, isEditorialRulingPage, shouldShowSourceDetails } from '@/lib/content/page-policy'

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

describe('isEditorialRulingPage', () => {
	test.each([
		{ path: '/cards/ahri', expected: true },
		{ path: '/mechanics/ambush', expected: true },
		{ path: '/general-rules/targeting', expected: true },
		{ path: '/', expected: false },
		{ path: '/reference/core-rules', expected: false },
		{ path: '/cards-reference', expected: false },
	])('returns $expected for $path', ({ path, expected }) => {
		expect(isEditorialRulingPage(path)).toBe(expected)
	})
})

describe('getRulingPageKind', () => {
	test.each([
		{ path: '/cards/ahri', expected: 'card' },
		{ path: '/mechanics/ambush', expected: 'mechanic' },
		{ path: '/general-rules/targeting', expected: 'general-rules' },
		{ path: '/', expected: undefined },
		{ path: '/cards-reference', expected: undefined },
	])('returns $expected for $path', ({ path, expected }) => {
		expect(getRulingPageKind(path)).toBe(expected)
	})
})
