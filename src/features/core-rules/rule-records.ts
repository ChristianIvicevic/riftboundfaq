import type { CoreRulesDocument, RuleNode, RulesHeading } from '@/features/core-rules/types'
import type { RuleRecord } from '@/lib/rules/types'

type SequencedRuleRecord = {
	sequence: number
	record: RuleRecord
}

export function flattenCoreRulesDocument(document: CoreRulesDocument): RuleRecord[] {
	// Keep PDF text authoritative; legacy extraction defects are not compatibility requirements.
	const records: SequencedRuleRecord[] = []
	const addHeading = (heading: RulesHeading) => {
		records.push({ sequence: heading.sequence, record: { id: heading.id, lines: [heading.text] } })
	}
	const addRules = (rules: RuleNode[]) => {
		for (const rule of rules) {
			records.push({
				sequence: rule.sequence,
				record: { id: rule.id, lines: rule.content.map((entry) => entry.text) },
			})
			addRules(rule.children)
		}
	}

	for (const section of document.sections) {
		addHeading(section.heading)
		addRules(section.preamble)
		for (const subsection of section.subsections) {
			addHeading(subsection.heading)
			addRules(subsection.rules)
		}
	}

	return records.toSorted((left, right) => left.sequence - right.sequence).map(({ record }) => record)
}
