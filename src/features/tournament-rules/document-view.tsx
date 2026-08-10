import {
	RulesDocumentRuleList,
	RulesDocumentSectionHeading,
	RulesDocumentSubsectionHeading,
} from '@/components/rules/document'
import type { TraversedRulesDocument } from '@/features/rules-documents/registry'
import { findTournamentRuleReferences } from '@/features/tournament-rules/references'

export function TournamentRulesDocumentView({ document }: { document: TraversedRulesDocument }) {
	return (
		<div className="not-prose mt-8 space-y-14">
			{document.sections.map((section) => {
				const sectionAnchor = section.heading.anchor
				return (
					<section aria-labelledby={sectionAnchor} key={sectionAnchor}>
						<RulesDocumentSectionHeading anchor={sectionAnchor} heading={section.heading} />

						<div className="mt-6 space-y-10">
							{section.blocks.map((block) => {
								if (block.kind === 'rules') {
									return (
										<RulesDocumentRuleList
											findReferences={findTournamentRuleReferences}
											key={`rules:${block.rules[0]?.anchor}`}
											labelMode="source"
											referenceTarget={document.referenceTarget}
											rules={block.rules}
										/>
									)
								}

								const subsectionAnchor = block.heading.anchor
								return (
									<section aria-labelledby={subsectionAnchor} className="scroll-mt-20" key={subsectionAnchor}>
										<RulesDocumentSubsectionHeading anchor={subsectionAnchor} heading={block.heading} />
										<RulesDocumentRuleList
											findReferences={findTournamentRuleReferences}
											labelMode="source"
											nested
											referenceTarget={document.referenceTarget}
											rules={block.rules}
										/>
									</section>
								)
							})}
						</div>
					</section>
				)
			})}
		</div>
	)
}
