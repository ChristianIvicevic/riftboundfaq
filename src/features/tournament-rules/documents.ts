import {
	CURRENT_PDF_TOURNAMENT_RULES_VERSION,
	PDF_TOURNAMENT_RULES_DOCUMENTS,
} from '@/generated/tournament-rules'

export function getTournamentRulesDocument(version: string) {
	const resolvedVersion = version === 'current' ? CURRENT_PDF_TOURNAMENT_RULES_VERSION : version
	const document = PDF_TOURNAMENT_RULES_DOCUMENTS[resolvedVersion]
	if (!document) throw new Error(`Unknown Tournament Rules version ${JSON.stringify(version)}`)
	return document
}
