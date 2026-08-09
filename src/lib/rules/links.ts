const CORE_RULES_PATH = '/reference/core-rules'
const TOURNAMENT_RULES_PATH = '/reference/tournament-rules'

export const coreRulesLinks = {
	document: (version: string) => `${CORE_RULES_PATH}/${version}`,
	rule: ({ number, version }: { number: string; version: string }) =>
		`${CORE_RULES_PATH}/${version}#R${number}`,
}

export const tournamentRulesLinks = {
	document: (version: string) => `${TOURNAMENT_RULES_PATH}/${version}`,
	rule: ({ anchor, version }: { anchor: string; version: string }) =>
		`${TOURNAMENT_RULES_PATH}/${version}#${anchor}`,
}
