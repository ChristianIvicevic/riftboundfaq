import { RulePreviewLink } from '@/components/core-rules/rule-preview-link'
import { rulesDocuments } from '@/features/rules-documents/registry'
import { coreRulesLinks } from '@/lib/rules/links'

export function Rule({ number, coreRulesVersion }: { number: string; coreRulesVersion?: string }) {
	if (!coreRulesVersion) {
		return <sup className="text-nowrap text-fd-muted-foreground">[{number}]</sup>
	}

	const rulesText = rulesDocuments.find({ type: 'core-rules', version: coreRulesVersion })?.lookupText(number)
	const href = coreRulesLinks.rule({ number, version: coreRulesVersion })

	return (
		<sup>
			{rulesText ? (
				<RulePreviewLink href={href} number={number} rulesText={rulesText} />
			) : (
				<a href={href} rel="noopener noreferrer" target="_blank" className="text-nowrap no-underline">
					[{number}]
				</a>
			)}
		</sup>
	)
}
