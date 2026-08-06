import { REGISTERED_CARD_NAMES } from '@/lib/cards/registry'
import type { RuleReference } from '@/lib/rules/types'

export type RulesExampleTextSegment =
	| { kind: 'text'; text: string }
	| { kind: 'card'; name: string; text: string }
	| { kind: 'rule-reference'; id: string; text: string }

type LocatedSegment = Exclude<RulesExampleTextSegment, { kind: 'text' }> & {
	start: number
	end: number
}

const CANONICAL_CARD_NAMES = new Map(
	REGISTERED_CARD_NAMES.map((name) => [normalizeApostrophes(name), name] as const),
)

const CARD_NAME_PATTERN = new RegExp(
	`(?<![\\p{L}\\p{N}])(?:${REGISTERED_CARD_NAMES.toSorted((a, b) => b.length - a.length)
		.map((name) => cardNameExpression(name))
		.join('|')})(?![\\p{L}\\p{N}])`,
	'gu',
)

function normalizeApostrophes(text: string) {
	return text.replaceAll('’', "'")
}

function cardNameExpression(name: string) {
	return name.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&').replaceAll("'", "['’]")
}

function findCardSegments(text: string): LocatedSegment[] {
	return [...text.matchAll(CARD_NAME_PATTERN)].map((match) => ({
		kind: 'card',
		name: CANONICAL_CARD_NAMES.get(normalizeApostrophes(match[0]))!,
		text: match[0],
		start: match.index,
		end: match.index + match[0].length,
	}))
}

export function segmentRulesExampleText(
	text: string,
	ruleReferences: RuleReference[],
): RulesExampleTextSegment[] {
	const locatedSegments: LocatedSegment[] = [
		...findCardSegments(text),
		...ruleReferences.map(({ id, start, end }) => ({
			kind: 'rule-reference' as const,
			id,
			text: text.slice(start, end),
			start,
			end,
		})),
	].toSorted((a, b) => a.start - b.start || b.end - a.end)

	const segments: RulesExampleTextSegment[] = []
	let cursor = 0
	for (const { start, end, ...segment } of locatedSegments) {
		if (start < cursor) continue
		if (start > cursor) segments.push({ kind: 'text', text: text.slice(cursor, start) })
		segments.push(segment)
		cursor = end
	}
	if (cursor < text.length) segments.push({ kind: 'text', text: text.slice(cursor) })

	return segments
}
