import { describe, expect, test } from 'vitest'
import { coreRulesLinks, tournamentRulesLinks } from './links'

describe('rules links', () => {
	test('builds Core Rules links for registered and unvalidated versions', () => {
		expect(coreRulesLinks.document('1.4')).toBe('/rules-documents/core-rules/1.4')
		expect(coreRulesLinks.document('unvalidated')).toBe('/rules-documents/core-rules/unvalidated')
		expect(coreRulesLinks.rule({ number: '123.4', version: '1.4' })).toBe(
			'/rules-documents/core-rules/1.4#R123.4',
		)
	})

	test('builds Tournament Rules links for registered and unvalidated versions', () => {
		expect(tournamentRulesLinks.document('2026-07-16')).toBe('/rules-documents/tournament-rules/2026-07-16')
		expect(tournamentRulesLinks.document('unvalidated')).toBe('/rules-documents/tournament-rules/unvalidated')
		expect(tournamentRulesLinks.rule({ anchor: 'R123', version: '2026-07-16' })).toBe(
			'/rules-documents/tournament-rules/2026-07-16#R123',
		)
	})
})
