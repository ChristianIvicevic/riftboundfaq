import type { TOCItemType } from 'fumadocs-core/toc'

type SequencedDocumentEntry = {
	sequence: number
}

export type RulesNavigationNode = {
	sequence: number
	id: string | null
	children: RulesNavigationNode[]
}

export type RulesNavigationEntry =
	| {
			kind: 'heading'
			sequence: number
			id: string
			text: string
			depth: number
	  }
	| {
			kind: 'rule'
			sequence: number
			id: string | null
	  }

export function rulesHeadingKey(heading: SequencedDocumentEntry) {
	return `heading:${heading.sequence}`
}

export function rulesRuleKey(rule: SequencedDocumentEntry) {
	return `rule:${rule.sequence}`
}

export function appendRulesNavigationEntries(entries: RulesNavigationEntry[], rules: RulesNavigationNode[]) {
	for (const rule of rules) {
		entries.push({ kind: 'rule', sequence: rule.sequence, id: rule.id })
		appendRulesNavigationEntries(entries, rule.children)
	}
}

export function createRulesDocumentNavigation(entries: RulesNavigationEntry[]) {
	const anchors = new Map<string, string>()
	const occurrences = new Map<string, number>()
	const referenceTargets = new Map<string, string>()
	const toc: TOCItemType[] = []

	for (const entry of entries) {
		if (!entry.id) {
			anchors.set(rulesRuleKey(entry), `U${entry.sequence}`)
			continue
		}

		const occurrence = (occurrences.get(entry.id) ?? 0) + 1
		occurrences.set(entry.id, occurrence)
		const anchor = `R${entry.id}${occurrence > 1 ? `-${occurrence}` : ''}`
		anchors.set(entry.kind === 'heading' ? rulesHeadingKey(entry) : rulesRuleKey(entry), anchor)
		if (!referenceTargets.has(entry.id)) referenceTargets.set(entry.id, anchor)
		if (entry.kind === 'heading') {
			toc.push({ title: `${entry.id}. ${entry.text}`, url: `#${anchor}`, depth: entry.depth })
		}
	}

	return { anchors, referenceTargets, ruleIds: new Set(referenceTargets.keys()), toc }
}
