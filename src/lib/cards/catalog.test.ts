import { describe, expect, test } from 'vitest'
import { CARD_NAMES, getCardImageUrl } from '@/lib/cards/catalog'
import cardCatalog from '../../../sources/card-catalog.json'

describe('card catalog', () => {
	test('keeps generated preview metadata synchronized with the source catalog', () => {
		expect(CARD_NAMES.map((name) => ({ name, imageUrl: getCardImageUrl(name) }))).toEqual(
			cardCatalog.map(({ name, imageUrl }) => ({ name, imageUrl })),
		)
	})

	test('returns undefined for an uncatalogued card', () => {
		expect(getCardImageUrl('Not a Card')).toBeUndefined()
	})
})
