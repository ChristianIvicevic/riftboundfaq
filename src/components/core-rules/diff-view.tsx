import { CRD_VERSIONS } from '@/components/core-rules/data'
import { diffRuleSets } from '@/components/rules/diff'
import { RulesDiffView } from '@/components/rules/diff-view'
import { ruleHref } from '@/lib/constants'

const VERSIONS = Object.keys(CRD_VERSIONS)

type CoreRulesDiffProps = {
	from?: string
	to?: string
}

export function CoreRulesDiff({ from = VERSIONS.at(-2), to = VERSIONS.at(-1) }: CoreRulesDiffProps) {
	const oldVersion = from ? CRD_VERSIONS[from] : undefined
	const newVersion = to ? CRD_VERSIONS[to] : undefined
	if (!oldVersion) throw new Error(`CoreRulesDiff: unknown "from" version ${JSON.stringify(from)}`)
	if (!newVersion) throw new Error(`CoreRulesDiff: unknown "to" version ${JSON.stringify(to)}`)

	return (
		<RulesDiffView
			entries={diffRuleSets(oldVersion.rules, newVersion.rules)}
			from={oldVersion.version}
			to={newVersion.version}
			fromLabel={oldVersion.name}
			toLabel={newVersion.name}
			ruleHref={ruleHref}
		/>
	)
}
