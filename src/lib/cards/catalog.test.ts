import { describe, expect, test } from 'vitest'
import { CARD_NAMES, getCardImageUrl, getCardReference } from '@/lib/cards/catalog'
import cardCatalog from '../../../sources/card-catalog.json'

describe('card catalog', () => {
	test('keeps generated preview metadata synchronized with the source catalog', () => {
		expect(CARD_NAMES.map((name) => ({ name, imageUrl: getCardImageUrl(name) }))).toEqual(
			cardCatalog.map(({ name, imageUrl }) => ({ name, imageUrl })),
		)
	})

	test('returns undefined for an uncatalogued card', () => {
		expect(getCardImageUrl('Not a Card')).toBeUndefined()
		expect(getCardReference('Not a Card')).toBeUndefined()
	})

	test('resolves errata as the current card text', () => {
		expect(getCardReference('Astral Heron')).toEqual({
			currentText:
				"When you play your first card each turn, if I'm at a battlefield, the next card you play this turn costs [2][Universal][Universal] less.",
			effectText: null,
			hasErrata: true,
			imageHeight: 1039,
			imageUrl:
				'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/b1ce87efc9a1a7e2438c53e034a7f92caaa67ed6-744x1039.png?accountingTag=RB',
			imageWidth: 744,
		})
	})

	test('keeps distinct card effects separate from ability text', () => {
		expect(getCardReference('Shady Spectacles')).toMatchObject({
			currentText:
				'[Equip] [1][Order] ([1][Order]: Attach this to a unit you control.)\nAs this is attached to a unit, choose another friendly unit. The equipped unit becomes a copy of that unit for as long as this is attached to it.',
			effectText: '(I am a copy of the chosen unit.)',
			hasErrata: false,
		})
	})

	test('preserves landscape image geometry', () => {
		expect(getCardReference('Abandoned Hall')).toMatchObject({
			imageHeight: 744,
			imageWidth: 1039,
		})
	})

	test('represents a stat-only card without rules text', () => {
		expect(getCardReference('Mega-Mech')).toMatchObject({
			currentText: null,
			effectText: null,
			hasErrata: false,
		})
	})
})
