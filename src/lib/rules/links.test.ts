import { describe, expect, test } from 'vitest'
import { coreRulesLinks, tournamentRulesLinks } from './links'

describe('rules links', () => {
	test('links every Core Rules version through its versioned route', () => {
		expect(coreRulesLinks.document('1.4')).toBe('/rules-documents/core-rules/1.4')
		expect(coreRulesLinks.document('1.3')).toBe('/rules-documents/core-rules/1.3')
		expect(coreRulesLinks.document('unvalidated')).toBe('/rules-documents/core-rules/unvalidated')
		expect(coreRulesLinks.rule({ number: '123.4', version: '1.4' })).toBe(
			'/rules-documents/core-rules/1.4#R123.4',
		)
	})

	test('links every Tournament Rules version through its versioned route', () => {
		expect(tournamentRulesLinks.document('2026-07-16')).toBe('/rules-documents/tournament-rules/2026-07-16')
		expect(tournamentRulesLinks.document('2026-04-29')).toBe('/rules-documents/tournament-rules/2026-04-29')
		expect(tournamentRulesLinks.document('unvalidated')).toBe('/rules-documents/tournament-rules/unvalidated')
		expect(tournamentRulesLinks.rule({ anchor: 'R123', version: '2026-07-16' })).toBe(
			'/rules-documents/tournament-rules/2026-07-16#R123',
		)
	})
})
