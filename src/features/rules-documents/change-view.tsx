import { ContextualRulesChangeDocument } from '@/components/rules/contextual-change-document'
import { ContextualRulesChangeView } from '@/components/rules/contextual-change-view'
import { prepareContextualRulesChange } from '@/features/rules-documents/contextual-change'
import { rulesDocuments } from '@/features/rules-documents/registry'
import type { RulesDocumentFamilyId } from '@/lib/rules/document-family-conventions'

function RulesDiff({ type, from, to }: { type: RulesDocumentFamilyId; from: string; to: string }) {
	const change = rulesDocuments.change({ type, from, to })
	const contextualChange = prepareContextualRulesChange(rulesDocuments.family(type), change)
	return (
		<ContextualRulesChangeView
			change={change}
			context={<ContextualRulesChangeDocument data={contextualChange} family={type} />}
		/>
	)
}

export function CoreRulesDiff({ from, to }: { from: string; to: string }) {
	return <RulesDiff from={from} to={to} type="core-rules" />
}

export function TournamentRulesDiff({ from, to }: { from: string; to: string }) {
	return <RulesDiff from={from} to={to} type="tournament-rules" />
}
