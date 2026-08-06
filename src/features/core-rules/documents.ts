import { CURRENT_PDF_CORE_RULES_VERSION, PDF_CORE_RULES_VERSIONS } from '@/generated/core-rules'

export function getCoreRulesDocument(version: string) {
	const resolvedVersion = version === 'current' ? CURRENT_PDF_CORE_RULES_VERSION : version
	const document = PDF_CORE_RULES_VERSIONS[resolvedVersion]
	if (!document) throw new Error(`Unknown Core Rules version ${JSON.stringify(version)}`)
	return document
}
