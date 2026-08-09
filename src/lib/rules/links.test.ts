import { describe, expect, test } from 'vitest'
import { coreRulesLinks, tournamentRulesLinks } from './links.ts'

describe('rules links', () => {
	test('links every Core Rules version through its versioned route', () => {
		expect(coreRulesLinks.document('1.4')).toBe('/reference/core-rules/1.4')
		expect(coreRulesLinks.document('1.3')).toBe('/reference/core-rules/1.3')
		expect(coreRulesLinks.rule({ number: '123.4', version: '1.4' })).toBe('/reference/core-rules/1.4#R123.4')
	})

	test('links every Tournament Rules version through its versioned route', () => {
		expect(tournamentRulesLinks.document('2026-07-16')).toBe('/reference/tournament-rules/2026-07-16')
		expect(tournamentRulesLinks.document('2026-04-29')).toBe('/reference/tournament-rules/2026-04-29')
		expect(tournamentRulesLinks.rule({ anchor: 'R123', version: '2026-07-16' })).toBe(
			'/reference/tournament-rules/2026-07-16#R123',
		)
	})
})
