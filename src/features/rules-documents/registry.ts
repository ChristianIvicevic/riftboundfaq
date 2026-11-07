import { adaptCoreRulesDocument } from '@/features/rules-documents/core-rules-adapter'
import {
	createRulesDocumentFamilyCatalog,
	type RulesDocumentReference,
} from '@/features/rules-documents/family-catalog'
import { adaptTournamentRulesDocument } from '@/features/rules-documents/tournament-rules-adapter'
import {
	CURRENT_PDF_CORE_RULES_VERSION,
	PDF_CORE_RULES_VERSION_NAMES,
	PDF_CORE_RULES_VERSIONS,
} from '@/generated/core-rules'
import {
	CURRENT_PDF_TOURNAMENT_RULES_VERSION,
	PDF_TOURNAMENT_RULES_DOCUMENTS,
} from '@/generated/tournament-rules'
import type { RulesDocumentFamilyId } from '@/lib/rules/document-family-conventions'

export { UnknownRulesVersionError } from '@/features/rules-documents/family-catalog'
export type {
	CompiledRulesDocument,
	RuleChangeMarker,
	RulesDocumentReference,
	RulesReferenceTarget,
	TraversedRule,
} from '@/features/rules-documents/family-catalog'

const families = {
	'core-rules': createRulesDocumentFamilyCatalog({
		type: 'core-rules',
		currentVersion: CURRENT_PDF_CORE_RULES_VERSION,
		documents: PDF_CORE_RULES_VERSIONS,
		names: PDF_CORE_RULES_VERSION_NAMES,
		adapt: adaptCoreRulesDocument,
	}),
	'tournament-rules': createRulesDocumentFamilyCatalog({
		type: 'tournament-rules',
		currentVersion: CURRENT_PDF_TOURNAMENT_RULES_VERSION,
		documents: PDF_TOURNAMENT_RULES_DOCUMENTS,
		adapt: adaptTournamentRulesDocument,
	}),
}

export const rulesDocuments = {
	get(reference: RulesDocumentReference) {
		return families[reference.type].get(reference.version)
	},
	find(reference: RulesDocumentReference) {
		return families[reference.type].find(reference.version)
	},
	family(type: RulesDocumentFamilyId) {
		return families[type]
	},
}
