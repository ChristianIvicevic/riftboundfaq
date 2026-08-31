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
			'Priority marks the player, if any, who may choose to act at the current moment, as timing allows. When players are allowed to respond before a spell or ability takes effect, the player with priority may play an eligible Reaction or pass to the next player.',
	},
	cleanup: {
		title: 'Cleanup',
		explanation:
			'A cleanup is an automatic rules check that happens after many changes in the game. It handles resulting board updates, such as killing units with lethal damage and updating battlefield control, before play continues.',
	},
	focus: {
		title: 'Focus',
		explanation:
			'During a showdown, focus marks the player who gets opportunity to start a sequence of events by playing an eligible card or activating an eligible ability. Focus usually passes to the next player once that entire sequence has finished. However, the player can instead pass focus, and if every player passes in turn without starting a sequence, the showdown ends.',
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
