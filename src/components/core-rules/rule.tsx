import { PDF_CORE_RULES_BY_ID } from '@/generated/core-rules'
import { ruleHref } from '@/lib/rules/links'

export function Rule({ number, coreRulesVersion }: { number: string; coreRulesVersion?: string }) {
	if (!coreRulesVersion) {
		return <sup className="text-nowrap text-fd-muted-foreground">[{number}]</sup>
	}

	const rulesText = PDF_CORE_RULES_BY_ID[coreRulesVersion]?.get(number)

	return (
		<sup>
			<a
				href={ruleHref(number, coreRulesVersion)}
				rel="noopener noreferrer"
				target="_blank"
				className="text-nowrap no-underline"
				title={rulesText}
			>
				[{number}]
			</a>
		</sup>
	)
}
