export const RULES_DOCUMENT_FAMILY_IDENTITIES = Object.freeze({
	'core-rules': Object.freeze({ id: 'core-rules', label: 'Core Rules' }),
	'tournament-rules': Object.freeze({ id: 'tournament-rules', label: 'Tournament Rules' }),
} as const)

export type RulesDocumentFamilyId = keyof typeof RULES_DOCUMENT_FAMILY_IDENTITIES
