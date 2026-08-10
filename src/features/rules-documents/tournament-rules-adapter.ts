import type { SourceRule, SourceRulesDocument } from '@/features/rules-documents/compile'
import type { TournamentRuleNode, TournamentRulesDocument } from '@/lib/rules/tournament-rules-document'

function adaptRules(rules: readonly TournamentRuleNode[]): SourceRule[] {
	return rules.map((rule) => ({
		sequence: rule.sequence,
		id: rule.id,
		label: rule.label,
		diffLabel: rule.label ?? 'Unnumbered',
		content: rule.content,
		children: adaptRules(rule.children),
	}))
}

export function adaptTournamentRulesDocument(document: TournamentRulesDocument): SourceRulesDocument {
	return {
		version: document.version,
		sections: document.sections.map((section) => ({
			heading: { ...section.heading, label: `${section.heading.id}.`, depth: 2 },
			blocks: section.blocks.map((block) => {
				if (block.kind === 'rules') return { kind: 'rules', rules: adaptRules(block.rules) }
				return {
					kind: 'subsection',
					heading: { ...block.heading, label: `${block.heading.id}.`, depth: 3 },
					rules: adaptRules(block.rules),
				}
			}),
		})),
	}
}

export function tournamentRulesDiffId(id: string | null, occurrence: number): string {
	return `${id ?? 'unnumbered'}::${occurrence}`
}
