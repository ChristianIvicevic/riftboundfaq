import { ORIGINS_CARDS } from '@/components/cards/origins'
import { PROVING_GROUNDS_CARDS } from '@/components/cards/proving-grounds'
import { SPIRITFORGED_CARDS } from '@/components/cards/spiritforged'
import { UNLEASHED_CARDS } from '@/components/cards/unleashed'
import { VENDETTA_CARDS } from '@/components/cards/vendetta'

const GALLERY_BASE = 'https://playriftbound.com/en-us/card-gallery/'

const SETS = [
	{ id: 'vendetta', cards: VENDETTA_CARDS as Record<string, string> },
	{ id: 'unleashed', cards: UNLEASHED_CARDS as Record<string, string> },
	{ id: 'spiritforged', cards: SPIRITFORGED_CARDS as Record<string, string> },
	{ id: 'origins', cards: ORIGINS_CARDS as Record<string, string> },
	{ id: 'proving-grounds', cards: PROVING_GROUNDS_CARDS as Record<string, string> },
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
