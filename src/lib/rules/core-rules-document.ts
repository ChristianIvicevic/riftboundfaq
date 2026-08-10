import type { RulesDocumentContent, RulesDocumentHeading } from '@/lib/rules/document-types'

export type RuleContent = RulesDocumentContent
export type RulesHeading = RulesDocumentHeading

export type RuleNode = {
	sequence: number
	id: string
	content: RuleContent[]
	children: RuleNode[]
}

export type CoreRulesSubsection = {
	heading: RulesHeading
	rules: RuleNode[]
}

export type CoreRulesSection = {
	heading: RulesHeading
	preamble: RuleNode[]
	subsections: CoreRulesSubsection[]
}

export type CoreRulesDocument = {
	schemaVersion: 3
	version: string
	sections: CoreRulesSection[]
}
