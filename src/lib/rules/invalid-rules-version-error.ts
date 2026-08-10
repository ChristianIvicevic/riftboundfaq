import {
	RULES_DOCUMENT_FAMILY_IDENTITIES,
	type RulesDocumentFamilyId,
} from '@/lib/rules/document-family-identity'

export class InvalidRulesVersionError extends TypeError {
	readonly code = 'INVALID_RULES_VERSION'

	constructor(
		readonly family: RulesDocumentFamilyId,
		readonly input: unknown,
	) {
		const { label } = RULES_DOCUMENT_FAMILY_IDENTITIES[family]
		const renderedInput = typeof input === 'string' ? JSON.stringify(input) : String(input)
		super(`Invalid ${label} version ${renderedInput}`)
	}
}
