import {
	RULES_DOCUMENT_FAMILY_IDENTITIES,
	type RulesDocumentFamilyId,
} from '@/lib/rules/document-family-identity'

export class InvalidRulesVersionError extends TypeError {
	readonly code = 'INVALID_RULES_VERSION'

	constructor(
		readonly family: RulesDocumentFamilyId,
		readonly input: string,
	) {
		const { label } = RULES_DOCUMENT_FAMILY_IDENTITIES[family]
		super(`Invalid ${label} version ${JSON.stringify(input)}`)
	}
}
