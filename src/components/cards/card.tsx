import { ORIGINS_CARDS } from '@/components/cards/sets/origins'
import { PROVING_GROUNDS_CARDS } from '@/components/cards/sets/proving-grounds'
import { SPIRITFORGED_CARDS } from '@/components/cards/sets/spiritforged'
import { UNLEASHED_CARDS } from '@/components/cards/sets/unleashed'
import { VENDETTA_CARDS } from '@/components/cards/sets/vendetta'

const GALLERY_BASE = 'https://playriftbound.com/en-us/card-gallery/'

function defineCardSet<const Id extends string>(id: Id, cards: Readonly<Record<string, string>>) {
	return { id, cards }
}

const SETS = [
	defineCardSet('vendetta', VENDETTA_CARDS),
	defineCardSet('unleashed', UNLEASHED_CARDS),
	defineCardSet('spiritforged', SPIRITFORGED_CARDS),
	defineCardSet('origins', ORIGINS_CARDS),
	defineCardSet('proving-grounds', PROVING_GROUNDS_CARDS),
] as const

type SetId = (typeof SETS)[number]['id']

function getCardUrl(name: string, set?: SetId): string | undefined {
	const maps = set ? SETS.filter((s) => s.id === set) : SETS
	for (const { cards } of maps) {
		const anchor = cards[name]
		if (anchor) return GALLERY_BASE + anchor
	}
}

export function Card({ name, set }: { name: string; set?: SetId }) {
	const url = getCardUrl(name, set)
	if (!url) return <span>{name}</span>
	return (
		<a href={url} target="_blank" rel="noopener noreferrer">
			{name}
		</a>
	)
}
