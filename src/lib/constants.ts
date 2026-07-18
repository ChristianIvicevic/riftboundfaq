export const CURRENT_CRD_VERSION = '1.4'
export const GITHUB_REPO_URL = 'https://github.com/ChristianIvicevic/riftboundfaq'

export const CORE_RULES_PATH = '/reference/core-rules'

// The current version is served by the bare alias (/reference/core-rules); every
// other version resolves to its archived snapshot (/reference/core-rules/{version}).
// This lets durable links (e.g. patch notes) reference a version and stay correct
// after CURRENT_CRD_VERSION is bumped, without editing the links themselves.
export const coreRulesHref = (version?: string) =>
	version && version !== CURRENT_CRD_VERSION ? `${CORE_RULES_PATH}/${version}` : CORE_RULES_PATH
export const ruleHref = (id: string, version?: string) => `${coreRulesHref(version)}#R${id}`
