import {
	RulesDocumentRuleList,
	RulesDocumentSectionHeading,
	RulesDocumentSubsectionHeading,
} from '@/components/rules/document'
import { findCoreRuleReferences } from '@/features/core-rules/references'
import type { TraversedRulesDocument } from '@/features/rules-documents/registry'

export function CoreRulesDocumentView({ document }: { document: TraversedRulesDocument }) {
	return (
		<div className="not-prose mt-8 space-y-14">
			{document.sections.map((section) => {
				const sectionAnchor = section.heading.anchor
				const preamble = section.blocks.find((block) => block.kind === 'rules')
				const subsections = section.blocks.filter((block) => block.kind === 'subsection')
				return (
					<section aria-labelledby={sectionAnchor} key={sectionAnchor}>
						<RulesDocumentSectionHeading anchor={sectionAnchor} heading={section.heading} />

						{preamble && preamble.rules.length > 0 && (
							<div className="mt-6">
								<RulesDocumentRuleList
									findReferences={findCoreRuleReferences}
									labelMode="id-with-period"
									referenceTarget={document.referenceTarget}
									rules={preamble.rules}
								/>
							</div>
						)}

						<div className="mt-6 space-y-10">
							{subsections.map((subsection) => {
								const subsectionAnchor = subsection.heading.anchor
								return (
									<section aria-labelledby={subsectionAnchor} className="scroll-mt-20" key={subsectionAnchor}>
										<RulesDocumentSubsectionHeading anchor={subsectionAnchor} heading={subsection.heading} />
										<RulesDocumentRuleList
											findReferences={findCoreRuleReferences}
											labelMode="id-with-period"
											referenceTarget={document.referenceTarget}
											rules={subsection.rules}
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
