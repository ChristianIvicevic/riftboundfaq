import { RulePreviewLink } from '@/components/core-rules/rule-preview-link'
import type { TraversedRulesDocument } from '@/features/rules-documents/registry'
import { coreRulesLinks } from '@/lib/rules/links'

export function Rule({ number, document }: { number: string; document?: TraversedRulesDocument }) {
	if (!document) {
		return <sup className="text-nowrap text-fd-muted-foreground">[{number}]</sup>
	}

	const rulesText = document.lookupText(number)
	const href = coreRulesLinks.rule({ number, version: document.identity.version })

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
