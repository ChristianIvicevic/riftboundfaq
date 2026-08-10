import {
	appendRulesNavigationEntries,
	createRulesDocumentNavigation,
	rulesHeadingKey,
	type RulesNavigationEntry,
} from '@/lib/rules/document-navigation'
import type { TournamentRulesDocument, TournamentRulesHeading } from '@/lib/rules/tournament-rules-document'

export function tournamentHeadingKey(heading: TournamentRulesHeading) {
	return rulesHeadingKey(heading)
}

export function createTournamentRulesNavigation(document: TournamentRulesDocument) {
	const entries: RulesNavigationEntry[] = []
	const appendHeading = (heading: TournamentRulesHeading, depth: number) => {
		entries.push({ kind: 'heading', sequence: heading.sequence, id: heading.id, text: heading.text, depth })
	}

	for (const section of document.sections) {
		appendHeading(section.heading, 2)
		for (const block of section.blocks) {
			if (block.kind === 'subsection') appendHeading(block.heading, 3)
			appendRulesNavigationEntries(entries, block.rules)
		}
	}

	return createRulesDocumentNavigation(entries)
}
