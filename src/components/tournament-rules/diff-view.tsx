import { RulesDiffView } from '@/components/rules/diff-view'
import { prepareTournamentRulesDiff } from '@/features/tournament-rules/rule-records'
import { PDF_TOURNAMENT_RULES_DOCUMENTS } from '@/generated/tournament-rules'
import { diffRuleSets } from '@/lib/rules/diff'
import { tournamentRulesLinks } from '@/lib/rules/links'

function formatVersion(version: string) {
	return new Intl.DateTimeFormat('en-US', {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC',
	}).format(new Date(`${version}T00:00:00Z`))
}

export function TournamentRulesDiff({
	from,
	to,
	includeChangeDescriptions = false,
}: {
	from: string
	to: string
	includeChangeDescriptions?: boolean
}) {
	const oldDocument = PDF_TOURNAMENT_RULES_DOCUMENTS[from]
	const newDocument = PDF_TOURNAMENT_RULES_DOCUMENTS[to]
	if (!oldDocument) throw new Error(`TournamentRulesDiff: unknown "from" version ${JSON.stringify(from)}`)
	if (!newDocument) throw new Error(`TournamentRulesDiff: unknown "to" version ${JSON.stringify(to)}`)
	const oldPreparation = prepareTournamentRulesDiff(oldDocument)
	const newPreparation = prepareTournamentRulesDiff(newDocument)
	const detailsByVersion = new Map([
		[from, oldPreparation.details],
		[to, newPreparation.details],
	])
	const getDetails = (ruleId: string, version: string) => {
		const details = detailsByVersion.get(version)?.get(ruleId)
		if (!details) throw new Error(`TournamentRulesDiff: unknown rule ${JSON.stringify(ruleId)}`)
		return details
	}

	return (
		<RulesDiffView
			entries={diffRuleSets(oldPreparation.rules, newPreparation.rules, {
				hideRenumbering: true,
				hideReferenceOnlyChanges: true,
				prioritizeTextSimilarity: true,
				referenceSyntax: 'tournament',
			})}
			from={oldDocument.version}
			to={newDocument.version}
			fromLabel={formatVersion(oldDocument.version)}
			toLabel={formatVersion(newDocument.version)}
			includeChangeDescriptions={includeChangeDescriptions}
			ruleHref={(ruleId, version) =>
				tournamentRulesLinks.rule({ anchor: getDetails(ruleId, version).anchor, version })
			}
			ruleLabel={(ruleId, version) => getDetails(ruleId, version).label}
		/>
	)
}
