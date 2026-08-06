import { createTournamentRulesNavigation } from '@/features/tournament-rules/navigation'
import type {
	TournamentRuleNode,
	TournamentRulesDocument,
	TournamentRulesHeading,
} from '@/features/tournament-rules/types'
import { rulesHeadingKey, rulesRuleKey } from '@/lib/rules/document-navigation'
import type { RuleRecord } from '@/lib/rules/types'

export type TournamentRuleRecord = {
	kind: 'heading' | 'rule'
	sequence: number
	id: string | null
	label: string | null
	lines: string[]
}

export function flattenTournamentRulesDocument(document: TournamentRulesDocument): TournamentRuleRecord[] {
	const records: TournamentRuleRecord[] = []
	const addHeading = (heading: TournamentRulesHeading) => {
		records.push({
			kind: 'heading',
			sequence: heading.sequence,
			id: heading.id,
			label: `${heading.id}.`,
			lines: [heading.text],
		})
	}
	const addRules = (rules: TournamentRuleNode[]) => {
		for (const rule of rules) {
			records.push({
				kind: 'rule',
				sequence: rule.sequence,
				id: rule.id,
				label: rule.label,
				lines: rule.content.map((entry) => entry.text),
			})
			addRules(rule.children)
		}
	}

	for (const section of document.sections) {
		addHeading(section.heading)
		for (const block of section.blocks) {
			if (block.kind === 'subsection') addHeading(block.heading)
			addRules(block.rules)
		}
	}

	return records.toSorted((left, right) => left.sequence - right.sequence)
}

export function prepareTournamentRulesDiff(document: TournamentRulesDocument) {
	const records = flattenTournamentRulesDocument(document)
	const { anchors } = createTournamentRulesNavigation(document)
	const occurrences = new Map<string, number>()
	const details = new Map<string, { anchor: string; label: string }>()
	const rules: RuleRecord[] = []

	for (const record of records) {
		const base = record.id ?? 'unnumbered'
		const occurrence = (occurrences.get(base) ?? 0) + 1
		occurrences.set(base, occurrence)
		const key = `${base}::${occurrence}`
		const anchor = anchors.get(record.kind === 'heading' ? rulesHeadingKey(record) : rulesRuleKey(record))
		if (!anchor) throw new Error(`Missing Tournament Rules anchor for source row ${record.sequence}`)
		details.set(key, { anchor, label: record.label ?? 'Unnumbered' })
		rules.push({ id: key, lines: record.lines })
	}

	return { rules, details }
}
