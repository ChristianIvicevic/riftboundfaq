import { ORIGINS_CARDS } from '@/components/cards/sets/origins'
import { PROVING_GROUNDS_CARDS } from '@/components/cards/sets/proving-grounds'
import { SPIRITFORGED_CARDS } from '@/components/cards/sets/spiritforged'
import { UNLEASHED_CARDS } from '@/components/cards/sets/unleashed'
import { VENDETTA_CARDS } from '@/components/cards/sets/vendetta'

const GALLERY_BASE_URL = 'https://playriftbound.com/en-us/card-gallery/'
const GALLERY_ANCHOR_PREFIX = '#card-gallery--'
const CARD_IMAGE_BASE_URL = 'https://wiki.leagueoflegends.com/en-us/images/RB_card_'

function defineCardSet<const Id extends string>(id: Id, cards: Readonly<Record<string, string>>) {
	return { id, cards }
}

const CARD_SETS = [
	defineCardSet('vendetta', VENDETTA_CARDS),
	defineCardSet('unleashed', UNLEASHED_CARDS),
	defineCardSet('spiritforged', SPIRITFORGED_CARDS),
	defineCardSet('origins', ORIGINS_CARDS),
	defineCardSet('proving-grounds', PROVING_GROUNDS_CARDS),
] as const

export type CardSetId = (typeof CARD_SETS)[number]['id']

export const REGISTERED_CARD_NAMES = [
	...new Set(CARD_SETS.flatMap(({ cards }) => Object.keys(cards))),
] as readonly string[]

export function getCardUrls(name: string, set?: CardSetId) {
	const sets = set ? CARD_SETS.filter(({ id }) => id === set) : CARD_SETS
	for (const { cards } of sets) {
		const anchor = cards[name]
		if (!anchor) continue
		const [setCode, collectorNumber] = anchor.slice(GALLERY_ANCHOR_PREFIX.length).split('-')
		return {
			galleryUrl: GALLERY_BASE_URL + anchor,
			imageUrl: `${CARD_IMAGE_BASE_URL}${setCode.toUpperCase()}-${collectorNumber.toUpperCase()}.png`,
		}
	}
}
