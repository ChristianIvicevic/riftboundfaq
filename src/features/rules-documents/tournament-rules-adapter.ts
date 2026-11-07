import type { SourceRule, SourceRulesDocument } from '@/features/rules-documents/compile'
import type { TournamentRuleNode, TournamentRulesDocument } from '@/lib/rules/tournament-rules-document'

function adaptRules(rules: readonly TournamentRuleNode[]): SourceRule[] {
	return rules.map((rule) => ({
		sequence: rule.sequence,
		id: rule.id,
		label: rule.label,
		content: rule.content,
		children: adaptRules(rule.children),
	}))
}

export function adaptTournamentRulesDocument(document: TournamentRulesDocument): SourceRulesDocument {
	return {
		version: document.version,
		sections: document.sections.map((section) => ({
			heading: { ...section.heading, depth: 2 },
			blocks: section.blocks.map((block) => {
				if (block.kind === 'rules') return { kind: 'rules', rules: adaptRules(block.rules) }
				return {
					kind: 'subsection',
					heading: { ...block.heading, depth: 3 },
					rules: adaptRules(block.rules),
				}
			}),
		})),
	}
}
