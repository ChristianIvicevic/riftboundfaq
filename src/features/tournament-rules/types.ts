import type { RulesDocumentContent, RulesDocumentHeading } from '@/lib/rules/document-types'

export type TournamentRuleContent = RulesDocumentContent
export type TournamentRulesHeading = RulesDocumentHeading

export type TournamentRuleNode = {
	sequence: number
	id: string | null
	label: string | null
	content: TournamentRuleContent[]
	children: TournamentRuleNode[]
}

export type TournamentRulesRuleBlock = {
	kind: 'rules'
	rules: TournamentRuleNode[]
}

export type TournamentRulesSubsectionBlock = {
	kind: 'subsection'
	heading: TournamentRulesHeading
	rules: TournamentRuleNode[]
}

export type TournamentRulesSectionBlock = TournamentRulesRuleBlock | TournamentRulesSubsectionBlock

export type TournamentRulesSection = {
	heading: TournamentRulesHeading
	blocks: TournamentRulesSectionBlock[]
}

export type TournamentRulesDocument = {
	schemaVersion: 1
	version: string
	sections: TournamentRulesSection[]
}
