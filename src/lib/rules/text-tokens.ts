const RULES_TEXT_TOKEN = /\d{3}(?:\.[0-9a-z]+)+(?![0-9a-z])|\s+|[\p{L}\p{N}\u200B]+|[^\p{L}\p{N}\s]/giu

export type IndexedRulesTextToken = Readonly<{
	text: string
	start: number
	end: number
}>

export function indexRulesText(text: string): IndexedRulesTextToken[] {
	return [...text.matchAll(RULES_TEXT_TOKEN)].map((match) => ({
		text: match[0],
		start: match.index,
		end: match.index + match[0].length,
	}))
}
