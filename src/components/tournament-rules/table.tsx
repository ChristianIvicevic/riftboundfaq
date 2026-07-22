import { RulesTable } from '@/components/rules/table'
import { findTournamentRuleReferences } from '@/components/tournament-rules/references'
import { TOURNAMENT_RULES_VERSIONS } from '@/generated/rules/tournament-rules'
import { CURRENT_TOURNAMENT_RULES_VERSION } from '@/lib/constants'

export function TournamentRulesTable({ version = CURRENT_TOURNAMENT_RULES_VERSION }: { version?: string }) {
	const tournamentRules = TOURNAMENT_RULES_VERSIONS[version]
	if (!tournamentRules) throw new Error(`TournamentRulesTable: unknown version ${JSON.stringify(version)}`)

	return <RulesTable rules={tournamentRules.rules} findReferences={findTournamentRuleReferences} />
}
