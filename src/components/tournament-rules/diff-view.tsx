import { RulesDiffView } from '@/components/rules/diff-view'
import { rulesDocuments, type TraversedRulesDocument } from '@/features/rules-documents/registry'
import { diffRuleSets } from '@/lib/rules/diff'
import { tournamentRulesLinks } from '@/lib/rules/links'

function formatVersion(version: string) {
	return new Intl.DateTimeFormat('en-US', {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC',
	}).format(new Date(`${version}T00:00:00Z`))
}

function indexDiffRecords(document: TraversedRulesDocument) {
	return new Map(document.diffRecords.map((record) => [record.id, record]))
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
	const tournamentRules = rulesDocuments.family('tournament-rules')
	// oxlint-disable-next-line unicorn/no-array-callback-reference -- This is a catalog lookup, not Array.find.
	const oldDocument = tournamentRules.find(from)
	// oxlint-disable-next-line unicorn/no-array-callback-reference -- This is a catalog lookup, not Array.find.
	const newDocument = tournamentRules.find(to)
	if (!oldDocument) throw new Error(`TournamentRulesDiff: unknown "from" version ${JSON.stringify(from)}`)
	if (!newDocument) throw new Error(`TournamentRulesDiff: unknown "to" version ${JSON.stringify(to)}`)
	const detailsByVersion = new Map([
		[from, indexDiffRecords(oldDocument)],
		[to, indexDiffRecords(newDocument)],
	])
	const getDetails = (ruleId: string, version: string) => {
		const details = detailsByVersion.get(version)?.get(ruleId)
		if (!details) throw new Error(`TournamentRulesDiff: unknown rule ${JSON.stringify(ruleId)}`)
		return details
	}

	return (
		<RulesDiffView
			entries={diffRuleSets(oldDocument.diffRecords, newDocument.diffRecords, {
				hideRenumbering: true,
				hideReferenceOnlyChanges: true,
				prioritizeTextSimilarity: true,
				referenceSyntax: 'tournament',
			})}
			from={oldDocument.identity.version}
			to={newDocument.identity.version}
			fromLabel={formatVersion(oldDocument.identity.version)}
			toLabel={formatVersion(newDocument.identity.version)}
			includeChangeDescriptions={includeChangeDescriptions}
			ruleHref={(ruleId, version) =>
				tournamentRulesLinks.rule({ anchor: getDetails(ruleId, version).anchor, version })
			}
			ruleLabel={(ruleId, version) => getDetails(ruleId, version).label}
		/>
	)
}
