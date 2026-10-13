import { describe, expect, test } from 'vitest'
import { getRiftboundWikiUrl } from '@/lib/cards/links'

describe('getRiftboundWikiUrl', () => {
	test('derives a Wiki title directly from the card name', () => {
		expect(getRiftboundWikiUrl('Alpha Strike')).toBe(
			'https://wiki.leagueoflegends.com/en-us/Riftbound:Alpha_Strike',
		)
	})

	test.each([
		['Recruit (NX)', 'Recruit'],
		['XP Tracker', 'XP_%26_Level'],
		['Yi, Honed', 'Master_Yi%2C_Honed'],
	])('uses the canonical Wiki title for %s', (cardName, wikiTitle) => {
		expect(getRiftboundWikiUrl(cardName)).toBe(
			`https://wiki.leagueoflegends.com/en-us/Riftbound:${wikiTitle}`,
		)
	})
})
