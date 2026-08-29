type GlossaryEntry = Readonly<{
	title: string
	explanation: string
}>

export const GLOSSARY = {
	chain: {
		title: 'Chain',
		explanation:
			'The chain is a temporary waiting area that keeps track of cards and abilities while they are being played and carried out. It is also where players add Reactions before waiting spells and most abilities take effect.',
	},
	pending: {
		title: 'Pending',
		explanation:
			'Pending means a card or ability has started being played, but its required up-front choices and costs are still being settled and the game still needs to confirm the play is legal. It has not yet completed the setup needed to take effect.',
	},
	finalization: {
		title: 'Finalization',
		explanation:
			'Finalization is the setup stage of playing a card or ability: settle its required up-front choices and costs, then check that the play is legal. Once finalized, that setup is complete, but its effects have not necessarily happened yet; spells and most abilities still wait before taking effect.',
	},
	resolution: {
		title: 'Resolution',
		explanation:
			'Resolution is when the game carries out a card or ability, including following its effect instructions in order. A card or ability can still resolve even if some or all of those instructions do nothing.',
	},
	priority: {
		title: 'Priority',
		explanation:
			'Priority identifies the one player who may choose to act at the current moment, as timing allows. While a card or ability is waiting to take effect, that player can use a Reaction or pass priority to the next player.',
	},
	cleanup: {
		title: 'Cleanup',
		explanation:
			'A cleanup is an automatic rules check that happens after many changes in the game. It handles resulting board updates, such as killing units with lethal damage and updating battlefield control, before play continues.',
	},
	focus: {
		title: 'Focus',
		explanation:
			'Focus marks which player gets the next chance to play a card, use an ability, or pass during a showdown over a battlefield. It usually moves to the next player when they pass or after everything waiting from their play is finished; a full round of passes with no play ends the showdown.',
	},
} as const satisfies Record<string, GlossaryEntry>

export type GlossaryItem = keyof typeof GLOSSARY

function isGlossaryItem(item: string): item is GlossaryItem {
	return Object.hasOwn(GLOSSARY, item)
}

export function getGlossaryEntry(item: string): GlossaryEntry {
	if (!isGlossaryItem(item)) throw new Error(`Unknown Glossary item "${item}"`)
	return GLOSSARY[item]
}
