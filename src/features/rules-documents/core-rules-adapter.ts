import type { SourceRule, SourceRulesDocument } from '@/features/rules-documents/compile'
import type { CoreRulesDocument, RuleNode } from '@/lib/rules/core-rules-document'

function adaptRules(rules: readonly RuleNode[]): SourceRule[] {
	return rules.map((rule) => ({
		sequence: rule.sequence,
		id: rule.id,
		label: `${rule.id}.`,
		diffLabel: `${rule.id}.`,
		content: rule.content,
		children: adaptRules(rule.children),
	}))
}

export function adaptCoreRulesDocument(document: CoreRulesDocument): SourceRulesDocument {
	return {
		version: document.version,
		sections: document.sections.map((section) => ({
			heading: { ...section.heading, label: `${section.heading.id}.`, depth: 2 },
			blocks: [
				{ kind: 'rules' as const, rules: adaptRules(section.preamble) },
				...section.subsections.map((subsection) => ({
					kind: 'subsection' as const,
					heading: { ...subsection.heading, label: `${subsection.heading.id}.`, depth: 3 as const },
					rules: adaptRules(subsection.rules),
				})),
			],
		})),
	}
}

export function coreRulesDiffId(id: string | null): string {
	return id ?? ''
}
