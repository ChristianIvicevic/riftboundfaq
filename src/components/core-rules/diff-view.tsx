import { RulesDiffView } from '@/components/rules/diff-view'
import { rulesDocuments } from '@/features/rules-documents/registry'
import { diffRuleSets } from '@/lib/rules/diff'
import { coreRulesLinks } from '@/lib/rules/links'

const CORE_RULES = rulesDocuments.family('core-rules')
const VERSIONS = CORE_RULES.registeredVersions

type CoreRulesDiffProps = {
	from?: string
	to?: string
}

export function CoreRulesDiff({
	from = VERSIONS.at(-2)?.version,
	to = VERSIONS.at(-1)?.version,
}: CoreRulesDiffProps) {
	if (!from) throw new Error('CoreRulesDiff: no default "from" version is available')
	if (!to) throw new Error('CoreRulesDiff: no default "to" version is available')

	// oxlint-disable-next-line unicorn/no-array-callback-reference -- This is a catalog lookup, not Array.find.
	const oldDocument = CORE_RULES.find(from)
	// oxlint-disable-next-line unicorn/no-array-callback-reference -- This is a catalog lookup, not Array.find.
	const newDocument = CORE_RULES.find(to)
	if (!oldDocument) throw new Error(`CoreRulesDiff: unknown "from" version ${JSON.stringify(from)}`)
	if (!newDocument) throw new Error(`CoreRulesDiff: unknown "to" version ${JSON.stringify(to)}`)

	return (
		<RulesDiffView
			entries={diffRuleSets(oldDocument.diffRecords, newDocument.diffRecords)}
			from={from}
			to={to}
			fromLabel={oldDocument.identity.name ?? `Core Rules ${from}`}
			toLabel={newDocument.identity.name ?? `Core Rules ${to}`}
			ruleHref={(number, version) => coreRulesLinks.rule({ number, version })}
		/>
	)
}
