import type { RulesManifest } from './rules-manifest'

const GENERATED_HEADER = '// Generated from sources/rules-manifest.json. Do not edit.\n\n'

export type RulesMetadataSummary = {
	coreRulesVersion: string
	tournamentRulesVersion: string
}

export type PreparedRulesMetadata = {
	contents: string
	summary: RulesMetadataSummary
}

export function prepareRulesMetadata(manifest: RulesManifest): PreparedRulesMetadata {
	const coreRulesVersion = manifest.coreRules.currentVersion.version
	const tournamentRulesVersion = manifest.tournamentRules.currentVersion.version
	const contents = `${GENERATED_HEADER}export const CURRENT_CORE_RULES_VERSION = ${JSON.stringify(coreRulesVersion)}\nexport const CURRENT_TOURNAMENT_RULES_VERSION = ${JSON.stringify(tournamentRulesVersion)}\n`

	return { contents, summary: { coreRulesVersion, tournamentRulesVersion } }
}
