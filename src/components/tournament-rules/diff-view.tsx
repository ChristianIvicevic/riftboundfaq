import { diffRuleSets } from '@/components/rules/diff'
import { RulesDiffView } from '@/components/rules/diff-view'
import { TOURNAMENT_RULES_VERSIONS } from '@/generated/rules/tournament-rules'
import { tournamentRuleHref } from '@/lib/constants'

const VERSIONS = Object.keys(TOURNAMENT_RULES_VERSIONS).toSorted()

function formatVersion(version: string) {
	return new Intl.DateTimeFormat('en-US', {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC',
	}).format(new Date(`${version}T00:00:00Z`))
}

type TournamentRulesDiffProps = {
	from?: string
	to?: string
}

export function TournamentRulesDiff({
	from = VERSIONS.at(-2),
	to = VERSIONS.at(-1),
}: TournamentRulesDiffProps) {
	const oldVersion = from ? TOURNAMENT_RULES_VERSIONS[from] : undefined
	const newVersion = to ? TOURNAMENT_RULES_VERSIONS[to] : undefined
	if (!oldVersion) throw new Error(`TournamentRulesDiff: unknown "from" version ${JSON.stringify(from)}`)
	if (!newVersion) throw new Error(`TournamentRulesDiff: unknown "to" version ${JSON.stringify(to)}`)

	return (
		<RulesDiffView
			entries={diffRuleSets(oldVersion.rules, newVersion.rules, {
				hideRenumbering: true,
				hideReferenceOnlyChanges: false,
				prioritizeTextSimilarity: true,
			})}
			from={oldVersion.version}
			to={newVersion.version}
			fromLabel={formatVersion(oldVersion.version)}
			toLabel={formatVersion(newVersion.version)}
			ruleHref={tournamentRuleHref}
		/>
	)
}
