export class UnknownRulesDocumentFamilyError extends TypeError {
	readonly code = 'UNKNOWN_RULES_DOCUMENT_FAMILY'

	constructor(readonly family: string) {
		super(`Unknown rules document family ${JSON.stringify(family)}`)
	}
}
