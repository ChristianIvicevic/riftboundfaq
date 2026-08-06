import {
	RulesDocumentRuleList,
	RulesDocumentSectionHeading,
	RulesDocumentSubsectionHeading,
} from '@/components/rules/document'
import { createCoreRulesNavigation, headingKey } from '@/features/core-rules/navigation'
import { findCoreRuleReferences } from '@/features/core-rules/references'
import type { CoreRulesDocument } from '@/features/core-rules/types'

export function CoreRulesDocumentView({ document }: { document: CoreRulesDocument }) {
	const { anchors, referenceTargets, ruleIds } = createCoreRulesNavigation(document)

	return (
		<div className="not-prose mt-8 space-y-14">
			{document.sections.map((section) => {
				const sectionAnchor = anchors.get(headingKey(section.heading))!
				return (
					<section aria-labelledby={sectionAnchor} key={headingKey(section.heading)}>
						<RulesDocumentSectionHeading anchor={sectionAnchor} heading={section.heading} />

						{section.preamble.length > 0 && (
							<div className="mt-6">
								<RulesDocumentRuleList
									anchors={anchors}
									findReferences={findCoreRuleReferences}
									labelMode="id-with-period"
									referenceTargets={referenceTargets}
									ruleIds={ruleIds}
									rules={section.preamble}
								/>
							</div>
						)}

						<div className="mt-6 space-y-10">
							{section.subsections.map((subsection) => {
								const subsectionAnchor = anchors.get(headingKey(subsection.heading))!
								return (
									<section
										aria-labelledby={subsectionAnchor}
										className="scroll-mt-20"
										key={headingKey(subsection.heading)}
									>
										<RulesDocumentSubsectionHeading anchor={subsectionAnchor} heading={subsection.heading} />
										<RulesDocumentRuleList
											anchors={anchors}
											findReferences={findCoreRuleReferences}
											labelMode="id-with-period"
											referenceTargets={referenceTargets}
											ruleIds={ruleIds}
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
