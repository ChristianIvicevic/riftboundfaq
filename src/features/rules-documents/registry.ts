import { adaptCoreRulesDocument, coreRulesDiffId } from '@/features/rules-documents/core-rules-adapter'
import {
	createRulesDocumentFamilyCatalog,
	type RulesDocumentFamily,
	type RulesDocumentReference,
} from '@/features/rules-documents/family-catalog'
import { prepareRulesChange } from '@/features/rules-documents/rules-change'
import {
	adaptTournamentRulesDocument,
	tournamentRulesDiffId,
} from '@/features/rules-documents/tournament-rules-adapter'
import {
	CURRENT_PDF_CORE_RULES_VERSION,
	PDF_CORE_RULES_VERSION_NAMES,
	PDF_CORE_RULES_VERSIONS,
} from '@/generated/core-rules'
import {
	CURRENT_PDF_TOURNAMENT_RULES_VERSION,
	PDF_TOURNAMENT_RULES_DOCUMENTS,
} from '@/generated/tournament-rules'

export {
	RulesDocumentInvariantError,
	UnknownRulesVersionError,
} from '@/features/rules-documents/family-catalog'
export type {
	RegisteredRulesVersionSummary,
	RulesDiffRecord,
	RulesDocumentFamily,
	RulesDocumentReference,
	RulesReferenceTarget,
	TraversedRule,
	TraversedRulesBlock,
	TraversedRulesDocument,
	TraversedRulesHeading,
	TraversedRulesSection,
} from '@/features/rules-documents/family-catalog'

const families = {
	'core-rules': createRulesDocumentFamilyCatalog({
		type: 'core-rules',
		currentVersion: CURRENT_PDF_CORE_RULES_VERSION,
		documents: PDF_CORE_RULES_VERSIONS,
		names: PDF_CORE_RULES_VERSION_NAMES,
		adapt: adaptCoreRulesDocument,
		diffId: coreRulesDiffId,
	}),
	'tournament-rules': createRulesDocumentFamilyCatalog({
		type: 'tournament-rules',
		currentVersion: CURRENT_PDF_TOURNAMENT_RULES_VERSION,
		documents: PDF_TOURNAMENT_RULES_DOCUMENTS,
		adapt: adaptTournamentRulesDocument,
		diffId: tournamentRulesDiffId,
	}),
}

export const rulesDocuments = {
	change({ type, from, to }: { type: RulesDocumentFamily; from: string; to: string }) {
		return prepareRulesChange(families[type], { from, to })
	},
	get(reference: RulesDocumentReference) {
		return families[reference.type].get(reference.version)
	},
	find(reference: RulesDocumentReference) {
		return families[reference.type].find(reference.version)
	},
	family(type: RulesDocumentFamily) {
		return families[type]
	},
}
