import { CURRENT_CRD_VERSION } from '@/generated/rules/core-rules'
import { CURRENT_TOURNAMENT_RULES_VERSION } from '@/generated/rules/tournament-rules'

export { CURRENT_CRD_VERSION, CURRENT_TOURNAMENT_RULES_VERSION }
export const GITHUB_REPO_URL = 'https://github.com/ChristianIvicevic/riftboundfaq'

export const CORE_RULES_PATH = '/reference/core-rules'
export const TOURNAMENT_RULES_PATH = '/reference/tournament-rules'

// The current version is served by the bare alias (/reference/core-rules); every
// other version resolves to its archived snapshot (/reference/core-rules/{version}).
// This lets durable links (e.g. change pages) reference a version and stay correct
// after CURRENT_CRD_VERSION is bumped, without editing the links themselves.
export const coreRulesHref = (version?: string) =>
	version && version !== CURRENT_CRD_VERSION ? `${CORE_RULES_PATH}/${version}` : CORE_RULES_PATH
export const ruleHref = (id: string, version?: string) => `${coreRulesHref(version)}#R${id}`

export const tournamentRulesHref = (version?: string) =>
	version && version !== CURRENT_TOURNAMENT_RULES_VERSION
		? `${TOURNAMENT_RULES_PATH}/${version}`
		: TOURNAMENT_RULES_PATH
export const tournamentRuleHref = (id: string, version?: string) => `${tournamentRulesHref(version)}#R${id}`
