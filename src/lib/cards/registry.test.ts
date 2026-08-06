import { describe, expect, test } from 'vitest'
import { getCardUrls } from '@/lib/cards/registry'

describe('getCardUrls', () => {
	test('derives URLs from the set and collector number', () => {
		expect(getCardUrls('Inferna', 'unleashed')).toEqual({
			galleryUrl: 'https://playriftbound.com/en-us/card-gallery/#card-gallery--unl-002-219',
			imageUrl: 'https://wiki.leagueoflegends.com/en-us/images/RB_card_UNL-002.png',
		})
	})

	test('preserves token collector numbers in image URLs', () => {
		expect(getCardUrls('Baron Pit', 'unleashed')?.imageUrl).toBe(
			'https://wiki.leagueoflegends.com/en-us/images/RB_card_UNL-T01.png',
		)
	})

	test('uses the requested set when a card appears in multiple sets', () => {
		expect(getCardUrls('Gold', 'spiritforged')?.imageUrl).toBe(
			'https://wiki.leagueoflegends.com/en-us/images/RB_card_SFD-T03.png',
		)
		expect(getCardUrls('Gold', 'unleashed')?.imageUrl).toBe(
			'https://wiki.leagueoflegends.com/en-us/images/RB_card_UNL-T05.png',
		)
	})

	test('returns undefined for an unregistered card', () => {
		expect(getCardUrls('Not a Card')).toBeUndefined()
	})
})
