import type { CoreRulesDocument, RulesHeading } from '@/lib/rules/core-rules-document'
import {
	appendRulesNavigationEntries,
	createRulesDocumentNavigation,
	rulesHeadingKey,
	type RulesNavigationEntry,
} from '@/lib/rules/document-navigation'

export function headingKey(heading: RulesHeading) {
	return rulesHeadingKey(heading)
}

export function createCoreRulesNavigation(document: CoreRulesDocument) {
	const entries: RulesNavigationEntry[] = []
	const appendHeading = (heading: RulesHeading, depth: number) => {
		entries.push({ kind: 'heading', sequence: heading.sequence, id: heading.id, text: heading.text, depth })
	}

	for (const section of document.sections) {
		appendHeading(section.heading, 2)
		appendRulesNavigationEntries(entries, section.preamble)
		for (const subsection of section.subsections) {
			appendHeading(subsection.heading, 3)
			appendRulesNavigationEntries(entries, subsection.rules)
		}
	}

	return createRulesDocumentNavigation(entries)
}
