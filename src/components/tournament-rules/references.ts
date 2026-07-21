const REFERENCE_CUE =
	/\b(?:see(?:\s+rule)?|section|proceed to|process of|described in|except for|perform|listed (?:under|in)|qualifies for)\s+/giu
const RULE_ID = /^(\d{3}(?:\.[0-9a-z]+)*)(\.)?(?![0-9a-z./])/iu
const CONJUNCTION = /^\s+(?:and|or)\s+/iu
const RANGE_SEPARATOR = /^[-–—]/u

export type TournamentRuleReference = {
	id: string
	start: number
	end: number
}

type ParsedReference = TournamentRuleReference & { matchEnd: number }

function parseReference(text: string, start: number, ruleIds: Set<string>): ParsedReference | null {
	const match = text.slice(start).match(RULE_ID)
	if (!match || !ruleIds.has(match[1])) return null

	const matchEnd = start + match[0].length
	if (RANGE_SEPARATOR.test(text.slice(matchEnd))) return null

	return { id: match[1], start, end: start + match[1].length, matchEnd }
}

export function findTournamentRuleReferences(text: string, ruleIds: Set<string>) {
	const references: TournamentRuleReference[] = []
	let consumedUntil = 0

	for (const cue of text.matchAll(REFERENCE_CUE)) {
		if (cue.index < consumedUntil) continue

		const first = parseReference(text, cue.index + cue[0].length, ruleIds)
		if (!first) continue

		references.push({ id: first.id, start: first.start, end: first.end })
		consumedUntil = first.matchEnd

		const conjunction = text.slice(first.matchEnd).match(CONJUNCTION)
		if (!conjunction) continue

		const second = parseReference(text, first.matchEnd + conjunction[0].length, ruleIds)
		if (!second) continue

		references.push({ id: second.id, start: second.start, end: second.end })
		consumedUntil = second.matchEnd
	}

	return references
}
