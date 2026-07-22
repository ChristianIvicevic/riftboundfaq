import type { RuleReference } from '@/components/rules/types'

const RULE_REFERENCE = /\brules?\s+(\d{3}(?:\.[0-9a-z]+)*)/giu

export function findCoreRuleReferences(text: string, ruleIds: ReadonlySet<string>): RuleReference[] {
	const references: RuleReference[] = []
	for (const match of text.matchAll(RULE_REFERENCE)) {
		const id = match[1]
		if (ruleIds.has(id)) references.push({ id, start: match.index, end: match.index + match[0].length })
	}
	return references
}
