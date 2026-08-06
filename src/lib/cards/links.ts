const RIFTBOUND_WIKI_BASE_URL = 'https://wiki.leagueoflegends.com/en-us/'

const WIKI_TITLE_OVERRIDES: Readonly<Record<string, string>> = {}

export function getRiftboundWikiUrl(cardName: string) {
	const wikiTitle = WIKI_TITLE_OVERRIDES[cardName] ?? cardName
	const encodedTitle = encodeURIComponent(wikiTitle).replaceAll('%20', '_')

	return new URL(`./Riftbound:${encodedTitle}`, RIFTBOUND_WIKI_BASE_URL).href
}
