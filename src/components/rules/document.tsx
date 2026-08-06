import type { ReactNode } from 'react'
import { Card } from '@/components/cards/card'
import { rulesRuleKey } from '@/lib/rules/document-navigation'
import type { RulesDocumentContent, RulesDocumentHeading } from '@/lib/rules/document-types'
import { segmentRulesExampleText } from '@/lib/rules/example-text'
import type { RuleReference } from '@/lib/rules/types'

type RulesDocumentRule = {
	sequence: number
	id: string | null
	label?: string | null
	content: RulesDocumentContent[]
	children: RulesDocumentRule[]
}

type FindRuleReferences = (text: string, ruleIds: ReadonlySet<string>) => RuleReference[]

function RuleReferenceLink({
	id,
	text,
	referenceTargets,
}: {
	id: string
	text: string
	referenceTargets: Map<string, string>
}) {
	return (
		<a
			className="font-medium text-fd-primary underline decoration-fd-primary/35 underline-offset-2 hover:decoration-fd-primary"
			href={`#${referenceTargets.get(id)}`}
		>
			{text}
		</a>
	)
}

function LinkedRuleText({
	text,
	referenceTargets,
	ruleIds,
	findReferences,
	linkCards = false,
}: {
	text: string
	referenceTargets: Map<string, string>
	ruleIds: ReadonlySet<string>
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
						referenceTargets={referenceTargets}
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
				referenceTargets={referenceTargets}
				text={text.slice(reference.start, reference.end)}
			/>,
		)
		cursor = reference.end
	}

	return [...nodes, text.slice(cursor)]
}

function RuleContentView({
	content,
	referenceTargets,
	ruleIds,
	findReferences,
}: {
	content: RulesDocumentContent[]
	referenceTargets: Map<string, string>
	ruleIds: ReadonlySet<string>
	findReferences: FindRuleReferences
}) {
	return (
		<div className="min-w-0 space-y-2 leading-6 wrap-anywhere">
			{content.map((entry, index) => {
				if (entry.kind === 'example') {
					return (
						<div
							className="border-l-2 border-amber-600 bg-amber-500/5 py-1 pr-2 pl-3 text-sm text-fd-muted-foreground dark:border-amber-400"
							key={index}
						>
							<LinkedRuleText
								findReferences={findReferences}
								linkCards
								referenceTargets={referenceTargets}
								ruleIds={ruleIds}
								text={entry.text}
							/>
						</div>
					)
				}

				if (entry.kind === 'reference') {
					return (
						<p className="text-sm text-fd-muted-foreground" key={index}>
							<LinkedRuleText
								findReferences={findReferences}
								referenceTargets={referenceTargets}
								ruleIds={ruleIds}
								text={entry.text}
							/>
						</p>
					)
				}

				if (entry.kind === 'bullet') {
					return (
						<div className="flex gap-2" key={index}>
							<span aria-hidden="true" className="text-fd-muted-foreground">
								•
							</span>
							<p>
								<LinkedRuleText
									findReferences={findReferences}
									referenceTargets={referenceTargets}
									ruleIds={ruleIds}
									text={entry.text}
								/>
							</p>
						</div>
					)
				}

				return (
					<p key={index}>
						<LinkedRuleText
							findReferences={findReferences}
							referenceTargets={referenceTargets}
							ruleIds={ruleIds}
							text={entry.text}
						/>
					</p>
				)
			})}
		</div>
	)
}

export function RulesDocumentRuleList({
	rules,
	anchors,
	referenceTargets,
	ruleIds,
	findReferences,
	labelMode,
	nested = false,
}: {
	rules: RulesDocumentRule[]
	anchors: Map<string, string>
	referenceTargets: Map<string, string>
	ruleIds: ReadonlySet<string>
	findReferences: FindRuleReferences
	labelMode: 'id-with-period' | 'source'
	nested?: boolean
}) {
	if (rules.length === 0) return null

	return (
		<ol
			className={
				nested
					? 'mt-2 ml-2 list-none space-y-2 border-l border-fd-border pl-2 sm:ml-5 sm:pl-5'
					: 'm-0 list-none space-y-2 p-0'
			}
		>
			{rules.map((rule) => {
				const anchor = anchors.get(rulesRuleKey(rule))!
				return (
					<li
						className="core-rules-anchor scroll-mt-20 target:border-l-2 target:border-sky-600 target:bg-sky-500/10 target:pr-2 target:pl-3 dark:target:border-sky-400"
						id={anchor}
						key={rule.sequence}
					>
						{rule.id ? (
							<div className="grid min-w-0 grid-cols-[max-content_minmax(0,1fr)] items-start gap-x-2 py-1.5 sm:gap-x-4">
								{labelMode === 'id-with-period' ? (
									<a
										aria-label={`Link to rule ${rule.id}`}
										className="font-mono text-sm leading-6 font-medium whitespace-nowrap text-fd-muted-foreground no-underline hover:text-fd-primary"
										href={`#${anchor}`}
									>
										{rule.id}.
									</a>
								) : (
									<a
										aria-label={`Link to rule ${rule.id}`}
										className="font-mono text-sm leading-6 font-medium whitespace-nowrap text-fd-muted-foreground no-underline hover:text-fd-primary"
										href={`#${anchor}`}
									>
										{rule.label}
									</a>
								)}
								<RuleContentView
									content={rule.content}
									findReferences={findReferences}
									referenceTargets={referenceTargets}
									ruleIds={ruleIds}
								/>
							</div>
						) : (
							<div className="py-1.5">
								<RuleContentView
									content={rule.content}
									findReferences={findReferences}
									referenceTargets={referenceTargets}
									ruleIds={ruleIds}
								/>
							</div>
						)}
						<RulesDocumentRuleList
							anchors={anchors}
							findReferences={findReferences}
							labelMode={labelMode}
							nested
							referenceTargets={referenceTargets}
							ruleIds={ruleIds}
							rules={rule.children}
						/>
					</li>
				)
			})}
		</ol>
	)
}

export function RulesDocumentHeadingLink({
	heading,
	anchor,
}: {
	heading: RulesDocumentHeading
	anchor: string
}) {
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
	heading: RulesDocumentHeading
	anchor: string
}) {
	return (
		<h2
			className="core-rules-anchor scroll-mt-20 border-b border-fd-border py-3 text-2xl font-semibold tracking-tight target:border-l-2 target:border-l-sky-600 target:bg-sky-500/10 target:pr-2 target:pl-3 sm:text-3xl dark:target:border-l-sky-400"
			id={anchor}
		>
			<RulesDocumentHeadingLink anchor={anchor} heading={heading} />
		</h2>
	)
}

export function RulesDocumentSubsectionHeading({
	heading,
	anchor,
}: {
	heading: RulesDocumentHeading
	anchor: string
}) {
	return (
		<h3
			className="core-rules-anchor mb-4 scroll-mt-20 py-2 text-xl font-semibold tracking-tight target:border-l-2 target:border-sky-600 target:bg-sky-500/10 target:pr-2 target:pl-3 sm:text-2xl dark:target:border-sky-400"
			id={anchor}
		>
			<RulesDocumentHeadingLink anchor={anchor} heading={heading} />
		</h3>
	)
}
