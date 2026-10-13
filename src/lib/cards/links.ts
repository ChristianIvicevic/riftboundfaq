const RIFTBOUND_WIKI_BASE_URL = 'https://wiki.leagueoflegends.com/en-us/'

const WIKI_TITLE_OVERRIDES = new Map([
	['Recruit (DE)', 'Recruit'],
	['Recruit (NX)', 'Recruit'],
	['Recruit (ZN)', 'Recruit'],
	['XP Tracker', 'XP & Level'],
	['Yi, Honed', 'Master Yi, Honed'],
	['Yi, Meditative', 'Master Yi, Meditative'],
])

export function getRiftboundWikiUrl(cardName: string) {
	const wikiTitle = WIKI_TITLE_OVERRIDES.get(cardName) ?? cardName
	const encodedTitle = encodeURIComponent(wikiTitle).replaceAll('%20', '_')

	return new URL(`./Riftbound:${encodedTitle}`, RIFTBOUND_WIKI_BASE_URL).href
}
