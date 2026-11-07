import { cva } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { Card } from '@/components/cards/card'
import { RulesContentBlock } from '@/components/rules/content-block'
import { RulesHeadingShell, RulesRuleListShell, RulesRuleShell } from '@/components/rules/document-shell'
import { Badge } from '@/components/ui/badge'
import type {
	RuleChangeMarker,
	RulesReferenceTarget,
	TraversedRule,
} from '@/features/rules-documents/registry'
import type { RulesDocumentContent, RulesDocumentHeading } from '@/lib/rules/document-types'
import { segmentRulesExampleText } from '@/lib/rules/example-text'
import type { RuleIdLookup, RuleReference } from '@/lib/rules/types'

type FindRuleReferences = (text: string, ruleIds: RuleIdLookup) => RuleReference[]
type FindReferenceTarget = (id: string) => RulesReferenceTarget | undefined
type DisplayRulesHeading = Pick<RulesDocumentHeading, 'id' | 'text'>

const ruleChangeBadgeVariants = cva('', {
	variants: {
		marker: {
			new: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
			changed: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
		},
		placement: {
			mobile: 'mt-1 flex sm:hidden',
			desktop: 'hidden self-start sm:mt-0.5 sm:inline-flex',
		},
	},
})

function RuleChangeBadge({
	marker,
	placement,
}: {
	marker: RuleChangeMarker
	placement: 'mobile' | 'desktop'
}) {
	return (
		<Badge
			className={ruleChangeBadgeVariants({ marker, placement })}
			variant={marker === 'new' ? 'default' : 'secondary'}
		>
			{marker === 'new' ? 'New' : 'Changed'}
		</Badge>
	)
}

function RuleReferenceLink({
	id,
	text,
	referenceTarget,
}: {
	id: string
	text: string
	referenceTarget: FindReferenceTarget
}) {
	const target = referenceTarget(id)
	if (!target) return text
	return (
		<a
			className="font-medium text-fd-primary underline decoration-fd-primary/35 underline-offset-2 hover:decoration-fd-primary"
			href={`#${target.anchor}`}
		>
			{text}
		</a>
	)
}

function LinkedRuleText({
	text,
	referenceTarget,
	ruleIds,
	findReferences,
	linkCards = false,
}: {
	text: string
	referenceTarget: FindReferenceTarget
	ruleIds: RuleIdLookup
	findReferences: FindRuleReferences
	linkCards?: boolean
}) {
	const references = findReferences(text, ruleIds)
	if (linkCards) {
		return segmentRulesExampleText(text, references).map((segment, index) => {
			if (segment.kind === 'card') {
				return (
					<Card key={index} name={segment.name}>
						{segment.text}
					</Card>
				)
			}
			if (segment.kind === 'rule-reference') {
				return (
					<RuleReferenceLink
						id={segment.id}
						key={index}
						referenceTarget={referenceTarget}
						text={segment.text}
					/>
				)
			}
			return segment.text
		})
	}
	if (references.length === 0) return text

	const nodes: ReactNode[] = []
	let cursor = 0
	for (const reference of references) {
		nodes.push(
			text.slice(cursor, reference.start),
			<RuleReferenceLink
				id={reference.id}
				key={reference.start}
				referenceTarget={referenceTarget}
				text={text.slice(reference.start, reference.end)}
			/>,
		)
		cursor = reference.end
	}

	return [...nodes, text.slice(cursor)]
}

function RuleContentView({
	content,
	changeMarker,
	referenceTarget,
	ruleIds,
	findReferences,
}: {
	content: readonly RulesDocumentContent[]
	changeMarker?: RuleChangeMarker
	referenceTarget: FindReferenceTarget
	ruleIds: RuleIdLookup
	findReferences: FindRuleReferences
}) {
	return (
		<>
			{content.map((entry, index) => {
				const mobileBadge =
					index === 0 && changeMarker ? <RuleChangeBadge marker={changeMarker} placement="mobile" /> : null
				return (
					<RulesContentBlock key={index} kind={entry.kind}>
						<LinkedRuleText
							findReferences={findReferences}
							linkCards={entry.kind === 'example'}
							referenceTarget={referenceTarget}
							ruleIds={ruleIds}
							text={entry.text}
						/>
						{mobileBadge}
					</RulesContentBlock>
				)
			})}
		</>
	)
}

export function RulesDocumentRuleList({
	rules,
	referenceTarget,
	findReferences,
	labelMode,
	nested = false,
}: {
	rules: readonly TraversedRule[]
	referenceTarget: FindReferenceTarget
	findReferences: FindRuleReferences
	labelMode: 'id-with-period' | 'source'
	nested?: boolean
}) {
	if (rules.length === 0) return null
	const ruleIds: RuleIdLookup = { has: (id) => referenceTarget(id) !== undefined }

	return (
		<RulesRuleListShell nested={nested}>
			{rules.map((rule) => {
				const anchor = rule.anchor
				const hasLabel = rule.id || (labelMode === 'source' && rule.label)
				const label = hasLabel ? (
					labelMode === 'id-with-period' ? (
						<a
							aria-label={`Link to rule ${rule.id}`}
							className="font-mono text-sm leading-6 font-medium whitespace-nowrap text-fd-muted-foreground no-underline hover:text-fd-primary"
							href={`#${anchor}`}
						>
							{rule.id}.
						</a>
					) : (
						<a
							aria-label={`Link to rule ${rule.id ?? rule.label}`}
							className="font-mono text-sm leading-6 font-medium whitespace-nowrap text-fd-muted-foreground no-underline hover:text-fd-primary"
							href={`#${anchor}`}
						>
							{rule.label}
						</a>
					)
				) : undefined
				return (
					<RulesRuleShell
						content={
							<RuleContentView
								changeMarker={rule.changeMarker}
								content={rule.content}
								findReferences={findReferences}
								referenceTarget={referenceTarget}
								ruleIds={ruleIds}
							/>
						}
						id={anchor}
						key={anchor}
						label={label}
						nestedRules={
							<RulesDocumentRuleList
								findReferences={findReferences}
								labelMode={labelMode}
								nested
								referenceTarget={referenceTarget}
								rules={rule.children}
							/>
						}
						trailing={
							rule.changeMarker ? (
								<RuleChangeBadge marker={rule.changeMarker} placement="desktop" />
							) : undefined
						}
					/>
				)
			})}
		</RulesRuleListShell>
	)
}

function RulesDocumentHeadingLink({ heading, anchor }: { heading: DisplayRulesHeading; anchor: string }) {
	return (
		<a className="group flex items-baseline gap-3 no-underline" href={`#${anchor}`}>
			<span className="font-mono text-[0.7em] font-medium text-fd-muted-foreground group-hover:text-fd-primary">
				{heading.id}.
			</span>
			<span>{heading.text}</span>
		</a>
	)
}

export function RulesDocumentSectionHeading({
	heading,
	anchor,
}: {
	heading: DisplayRulesHeading
	anchor: string
}) {
	return (
		<RulesHeadingShell depth="section" id={anchor}>
			<RulesDocumentHeadingLink anchor={anchor} heading={heading} />
		</RulesHeadingShell>
	)
}

export function RulesDocumentSubsectionHeading({
	heading,
	anchor,
}: {
	heading: DisplayRulesHeading
	anchor: string
}) {
	return (
		<RulesHeadingShell depth="subsection" id={anchor}>
			<RulesDocumentHeadingLink anchor={anchor} heading={heading} />
		</RulesHeadingShell>
	)
}
