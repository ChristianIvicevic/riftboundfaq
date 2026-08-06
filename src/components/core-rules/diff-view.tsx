import { RulesDiffView } from '@/components/rules/diff-view'
import { flattenCoreRulesDocument } from '@/features/core-rules/rule-records'
import { PDF_CORE_RULES_VERSION_NAMES, PDF_CORE_RULES_VERSIONS } from '@/generated/core-rules'
import { diffRuleSets } from '@/lib/rules/diff'
import { ruleHref } from '@/lib/rules/links'

const VERSIONS = Object.keys(PDF_CORE_RULES_VERSIONS)
const RULES_BY_VERSION = Object.fromEntries(
	VERSIONS.map((version) => [version, flattenCoreRulesDocument(PDF_CORE_RULES_VERSIONS[version])]),
)

type CoreRulesDiffProps = {
	from?: string
	to?: string
}

export function CoreRulesDiff({ from = VERSIONS.at(-2), to = VERSIONS.at(-1) }: CoreRulesDiffProps) {
	if (!from) throw new Error('CoreRulesDiff: no default "from" version is available')
	if (!to) throw new Error('CoreRulesDiff: no default "to" version is available')

	const oldRules = RULES_BY_VERSION[from]
	const newRules = RULES_BY_VERSION[to]
	if (!oldRules) throw new Error(`CoreRulesDiff: unknown "from" version ${JSON.stringify(from)}`)
	if (!newRules) throw new Error(`CoreRulesDiff: unknown "to" version ${JSON.stringify(to)}`)

	return (
		<RulesDiffView
			entries={diffRuleSets(oldRules, newRules)}
			from={from}
			to={to}
			fromLabel={PDF_CORE_RULES_VERSION_NAMES[from] ?? `Core Rules ${from}`}
			toLabel={PDF_CORE_RULES_VERSION_NAMES[to] ?? `Core Rules ${to}`}
			ruleHref={ruleHref}
		/>
	)
}
