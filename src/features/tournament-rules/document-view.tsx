import {
	RulesDocumentRuleList,
	RulesDocumentSectionHeading,
	RulesDocumentSubsectionHeading,
} from '@/components/rules/document'
import { createTournamentRulesNavigation, tournamentHeadingKey } from '@/features/tournament-rules/navigation'
import { findTournamentRuleReferences } from '@/features/tournament-rules/references'
import type { TournamentRulesDocument } from '@/features/tournament-rules/types'

export function TournamentRulesDocumentView({ document }: { document: TournamentRulesDocument }) {
	const { anchors, referenceTargets, ruleIds } = createTournamentRulesNavigation(document)

	return (
		<div className="not-prose mt-8 space-y-14">
			{document.sections.map((section) => {
				const sectionAnchor = anchors.get(tournamentHeadingKey(section.heading))!
				return (
					<section aria-labelledby={sectionAnchor} key={tournamentHeadingKey(section.heading)}>
						<RulesDocumentSectionHeading anchor={sectionAnchor} heading={section.heading} />

						<div className="mt-6 space-y-10">
							{section.blocks.map((block) => {
								if (block.kind === 'rules') {
									return (
										<RulesDocumentRuleList
											anchors={anchors}
											findReferences={findTournamentRuleReferences}
											key={`rules:${block.rules[0]?.sequence}`}
											labelMode="source"
											referenceTargets={referenceTargets}
											ruleIds={ruleIds}
											rules={block.rules}
										/>
									)
								}

								const subsectionAnchor = anchors.get(tournamentHeadingKey(block.heading))!
								return (
									<section
										aria-labelledby={subsectionAnchor}
										className="scroll-mt-20"
										key={tournamentHeadingKey(block.heading)}
									>
										<RulesDocumentSubsectionHeading anchor={subsectionAnchor} heading={block.heading} />
										<RulesDocumentRuleList
											anchors={anchors}
											findReferences={findTournamentRuleReferences}
											labelMode="source"
											nested
											referenceTargets={referenceTargets}
											ruleIds={ruleIds}
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
