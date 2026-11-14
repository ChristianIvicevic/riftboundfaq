import { Result } from 'effect'
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion'
import { RulesContentBlock } from '@/components/rules/content-block'
import {
	RulesDocumentPresentation,
	RulesRuleLabelShell,
	RulesRuleListShell,
	RulesRuleShell,
} from '@/components/rules/document-shell'
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge'
import { rulesDocuments } from '@/features/rules-documents/registry'
import {
	projectTournamentInfractions,
	type TournamentInfractionPenalty,
	type TournamentInfractionRule,
} from '@/features/tournament-infractions/projection'
import { tournamentRulesLinks } from '@/lib/rules/links'

const PENALTY_TONES = {
	'No Penalty': 'positive',
	Warning: 'caution',
	Conditional: 'caution',
	'Game Loss': 'negative',
	'Match Loss': 'negative',
	Disqualification: 'negative',
} satisfies Record<TournamentInfractionPenalty, StatusBadgeTone>

function InfractionRuleList({
	rules,
	nested = false,
}: {
	rules: readonly TournamentInfractionRule[]
	nested?: boolean
}) {
	if (rules.length === 0) return null

	return (
		<RulesRuleListShell nested={nested}>
			{rules.map((rule) => {
				const displayLabel = rule.label ?? (rule.id ? `${rule.id}.` : null)
				return (
					<RulesRuleShell
						content={rule.content.map((entry, index) => (
							<RulesContentBlock key={index} kind={entry.kind}>
								{entry.text}
							</RulesContentBlock>
						))}
						key={rule.anchor}
						label={
							displayLabel ? (
								<RulesRuleLabelShell>
									<span className="font-mono leading-6 font-medium whitespace-nowrap text-fd-muted-foreground">
										{displayLabel}
									</span>
								</RulesRuleLabelShell>
							) : undefined
						}
						nestedRules={<InfractionRuleList nested rules={rule.children} />}
						stackLabelOnMobile
					/>
				)
			})}
		</RulesRuleListShell>
	)
}

export function TournamentInfractions() {
	const document = rulesDocuments.family('tournament-rules').current
	const index = Result.getOrThrow(projectTournamentInfractions(document))

	return (
		<RulesDocumentPresentation>
			<div className="not-prose min-w-0 space-y-10">
				{index.categories.map((category) => (
					<section aria-labelledby={category.anchor} className="min-w-0" key={category.id}>
						<h2
							className="mb-4 scroll-mt-[calc(var(--fd-banner-height,0px)+var(--fd-header-height)+4rem)] text-xl font-semibold tracking-tight sm:text-2xl md:scroll-mt-[calc(var(--fd-header-height)+4rem)]"
							id={category.anchor}
						>
							{category.name}
						</h2>
						<Accordions className="bg-fd-background" multiple>
							{category.infractions.map((infraction) => {
								const sourceHref = tournamentRulesLinks.rule({
									anchor: infraction.anchor,
									version: index.version,
								})

								return (
									<Accordion
										className="min-w-0 motion-reduce:[&_*]:transition-none [&>div>div]:px-4 [&>div>div]:pb-4 [&>h3]:scroll-mt-[calc(var(--fd-banner-height,0px)+var(--fd-header-height)+4rem)] md:[&>h3]:scroll-mt-[calc(var(--fd-header-height)+4rem)] [&>h3>button:first-child]:min-w-0"
										id={infraction.anchor}
										key={infraction.id}
										title={
											<span
												className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] items-start gap-x-2 gap-y-1 py-0.5 font-sans sm:grid-cols-[minmax(0,1fr)_max-content]"
												key={`${infraction.anchor}-title`}
											>
												<span className="min-w-0 leading-5 font-semibold wrap-anywhere">
													{infraction.name}
												</span>
												<StatusBadge
													className="row-start-2 mt-px sm:col-start-2 sm:row-start-1"
													tone={PENALTY_TONES[infraction.penalty]}
												>
													{infraction.penalty}
												</StatusBadge>
												{infraction.definition ? (
													<span className="row-start-3 text-sm leading-5 font-normal wrap-anywhere text-fd-muted-foreground sm:col-span-2 sm:row-start-2 sm:line-clamp-2">
														{infraction.definition}
													</span>
												) : null}
											</span>
										}
										value={infraction.anchor}
									>
										<a
											className="mb-4 inline-flex rounded-sm text-sm font-medium text-fd-primary underline decoration-fd-border underline-offset-4 outline-none hover:decoration-fd-primary focus-visible:ring-2 focus-visible:ring-fd-ring"
											href={sourceHref}
										>
											View {infraction.id} in Tournament Rules
										</a>
										<InfractionRuleList rules={[infraction.details]} />
									</Accordion>
								)
							})}
						</Accordions>
					</section>
				))}
			</div>
		</RulesDocumentPresentation>
	)
}
