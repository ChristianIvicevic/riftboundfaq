import type { CoreRulesDocument, RuleNode } from '@/features/core-rules/types'

function addRules(lookup: Map<string, string>, rules: RuleNode[]) {
	for (const rule of rules) {
		if (!lookup.has(rule.id)) lookup.set(rule.id, rule.content.map((entry) => entry.text).join(' '))
		addRules(lookup, rule.children)
	}
}

export function buildCoreRulesLookup(document: CoreRulesDocument) {
	const lookup = new Map<string, string>()
	for (const section of document.sections) {
		lookup.set(section.heading.id, section.heading.text)
		addRules(lookup, section.preamble)
		for (const subsection of section.subsections) {
			if (!lookup.has(subsection.heading.id)) lookup.set(subsection.heading.id, subsection.heading.text)
			addRules(lookup, subsection.rules)
		}
	}
	return lookup
}
