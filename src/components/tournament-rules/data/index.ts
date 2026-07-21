import type { RuleRecord } from '@/components/rules/types'
import { TOURNAMENT_RULES_2026_03_30 } from '@/components/tournament-rules/data/v2026-03-30'
import { TOURNAMENT_RULES_2026_04_29 } from '@/components/tournament-rules/data/v2026-04-29'
import { TOURNAMENT_RULES_2026_07_16 } from '@/components/tournament-rules/data/v2026-07-16'

export type TournamentRulesVersion = {
	version: string
	rules: RuleRecord[]
}

export const TOURNAMENT_RULES_VERSIONS: Record<string, TournamentRulesVersion> = {
	'2026-03-30': { version: '2026-03-30', rules: TOURNAMENT_RULES_2026_03_30 },
	'2026-04-29': { version: '2026-04-29', rules: TOURNAMENT_RULES_2026_04_29 },
	'2026-07-16': { version: '2026-07-16', rules: TOURNAMENT_RULES_2026_07_16 },
}
