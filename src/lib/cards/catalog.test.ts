import { describe, expect, test } from 'vitest'
import { CARD_NAMES, getCardImageUrl, getCardReference } from '@/lib/cards/catalog'
import cardCatalog from '../../../sources/card-catalog.json'
import cardErrata from '../../../sources/card-errata.json'

// SAFETY: The owned errata source is keyed by card name and every correction contains newText.
const ERRATA_BY_NAME = cardErrata as Record<string, readonly { newText: string }[]>

function expectedGeneratedCardText(text: string | null) {
	return text?.replaceAll(/([+\d-])[ \t]+\[Might\]/gu, '$1[Might]') ?? null
}

function imageDimensions(imageUrl: string) {
	const dimensions = /-(\d+)x(\d+)\.[^/]+$/u.exec(new URL(imageUrl).pathname)
	if (!dimensions) throw new Error(`Card image URL does not contain dimensions: ${imageUrl}`)
	return { imageWidth: Number(dimensions[1]), imageHeight: Number(dimensions[2]) }
}

describe('card catalog', () => {
	test('keeps complete generated card metadata synchronized with the catalog and errata', () => {
		expect(CARD_NAMES).toEqual(cardCatalog.map(({ name }) => name))

		for (const card of cardCatalog) {
			const reference = getCardReference(card.name)
			if (!reference) throw new Error(`Missing generated card reference for ${card.name}`)
			const correction = ERRATA_BY_NAME[card.name]?.[0]

			expect(reference).toEqual({
				imageUrl: card.imageUrl,
				...imageDimensions(card.imageUrl),
				currentText: expectedGeneratedCardText(correction?.newText ?? card.abilities),
				effectText: expectedGeneratedCardText(card.effects),
				hasErrata: correction !== undefined,
			})
		}

		expect(CARD_NAMES.filter((name) => getCardReference(name)?.hasErrata).toSorted()).toEqual(
			Object.keys(ERRATA_BY_NAME).toSorted(),
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
