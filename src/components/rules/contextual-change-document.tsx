import { cva, type VariantProps } from 'class-variance-authority'
import { Function, Match } from 'effect'
import type { ReactNode } from 'react'
import { Del, Ins } from '@/components/diff-marks'
import { RulesChangeBadge } from '@/components/rules/change-badge'
import { RulesContentBlock } from '@/components/rules/content-block'
import {
	RulesDocumentShell,
	RulesHeadingShell,
	RulesRuleListShell,
	RulesRuleShell,
	RulesSectionBody,
	RulesSectionPreamble,
	type RulesDocumentTone,
} from '@/components/rules/document-shell'
import type {
	ContextualChangeBlock,
	ContextualChangeNode,
	ContextualChangeStatus,
	ContextualChangeText,
	ContextualRulesChange,
} from '@/features/rules-documents/contextual-change'
import { cn } from '@/lib/cn'
import type { RulesDocumentFamilyId } from '@/lib/rules/document-family-conventions'

const nodeStatusVariants = cva('flex flex-wrap items-center gap-2', {
	variants: {
		placement: {
			mobile: 'mt-1 sm:hidden',
			'mobile-inline': 'shrink-0 sm:hidden',
			desktop: 'hidden shrink-0 justify-end self-start sm:mt-0.5 sm:flex',
		},
	},
})

const semanticChangeForStatus = Match.type<ContextualChangeStatus | undefined>().pipe(
	Match.when('new', () => 'added' as const),
	Match.when('deleted', () => 'removed' as const),
	Match.orElse(Function.constUndefined),
)

function LinkedText({ segment }: { segment: ContextualChangeText }) {
	const content = segment.href ? (
		<a
			className="font-medium text-fd-primary underline decoration-fd-primary/35 underline-offset-2 hover:decoration-fd-primary"
			href={segment.href}
			rel="noopener noreferrer"
			target="_blank"
		>
			{segment.text}
			<span className="sr-only"> in {segment.sourceLabel} (opens source rules in a new tab)</span>
		</a>
	) : (
		segment.text
	)
	if (segment.type === 'remove') return <Del>{content}</Del>
	if (segment.type === 'add') return <Ins>{content}</Ins>
	return content
}

function TextSequence({ text }: { text: readonly ContextualChangeText[] }) {
	return text.map((segment, index) => <LinkedText key={index} segment={segment} />)
}

function SemanticChange({
	change,
	children,
}: {
	change: 'added' | 'removed' | undefined
	children: ReactNode
}) {
	if (change === 'added') return <ins className="block no-underline">{children}</ins>
	if (change === 'removed') return <del className="block line-through">{children}</del>
	return children
}

function ContentBlock({
	block,
	nodeStatus,
}: {
	block: ContextualChangeBlock
	nodeStatus?: ContextualChangeStatus
}) {
	const semanticChange = semanticChangeForStatus(nodeStatus)
	const content = (
		<RulesContentBlock kind={block.kind}>
			<TextSequence text={block.text} />
		</RulesContentBlock>
	)
	return <SemanticChange change={semanticChange}>{content}</SemanticChange>
}

function ContentBlocks({
	blocks,
	nodeStatus,
	showMobileStatus,
}: {
	blocks: readonly ContextualChangeBlock[]
	nodeStatus?: ContextualChangeStatus
	showMobileStatus: boolean
}) {
	return blocks.map((block, index) => {
		if (!nodeStatus || !showMobileStatus || index !== blocks.length - 1) {
			return <ContentBlock block={block} key={index} nodeStatus={nodeStatus} />
		}
		return (
			<div key={index}>
				<ContentBlock block={block} nodeStatus={nodeStatus} />
				<NodeStatus status={nodeStatus} placement="mobile" />
			</div>
		)
	})
}

function NodeSourceLink({
	source,
	heading,
}: {
	source: Pick<ContextualChangeNode, 'label' | 'href' | 'sourceLabel'>
	heading: boolean
}) {
	return (
		<a
			className={cn(
				'font-mono font-medium whitespace-nowrap text-fd-muted-foreground no-underline hover:text-fd-primary',
				heading ? 'text-[0.7em]' : 'text-sm leading-6',
			)}
			href={source.href}
			rel="noopener noreferrer"
			target="_blank"
		>
			{source.label ?? 'Unnumbered'}
			<span className="sr-only"> in {source.sourceLabel} (opens in a new tab)</span>
		</a>
	)
}

function NodeLabel({ node, heading = false }: { node: ContextualChangeNode; heading?: boolean }) {
	return <NodeSourceLink heading={heading} source={node} />
}

function NodeStatus({
	status,
	placement,
}: {
	status?: ContextualChangeStatus
	placement: NonNullable<VariantProps<typeof nodeStatusVariants>['placement']>
}) {
	if (!status) return null
	return (
		<span className={nodeStatusVariants({ placement })}>
			<RulesChangeBadge status={status} />
		</span>
	)
}

function nodeTone(status: ContextualChangeStatus | undefined): RulesDocumentTone {
	if (status === 'new') return 'added'
	return status ?? 'neutral'
}

function HeadingNode({ node }: { node: ContextualChangeNode }) {
	const title = <TextSequence text={node.content[0]?.text ?? []} />
	return (
		<RulesHeadingShell
			depth={node.headingDepth === 2 ? 'section' : 'subsection'}
			id={node.anchor}
			tone={nodeTone(node.status)}
			trailing={node.status ? <NodeStatus status={node.status} placement="desktop" /> : undefined}
		>
			<span className="min-w-0">
				<span className="flex min-w-0 items-baseline gap-3">
					<NodeLabel heading node={node} />
					<span
						className={cn(
							'min-w-0 font-semibold tracking-tight text-fd-foreground',
							node.status === 'deleted' && 'text-fd-muted-foreground',
						)}
					>
						<SemanticChange change={semanticChangeForStatus(node.status)}>{title}</SemanticChange>
					</span>
				</span>
				<NodeStatus status={node.status} placement="mobile" />
			</span>
		</RulesHeadingShell>
	)
}

function RuleNode({ node }: { node: ContextualChangeNode }) {
	const hasLabel = node.label !== null
	const label = hasLabel ? (
		<span className="flex min-w-0 items-center justify-between gap-2">
			<NodeLabel node={node} />
			<NodeStatus placement="mobile-inline" status={node.status} />
		</span>
	) : undefined
	return (
		<RulesRuleShell
			content={
				<>
					{!hasLabel && (
						<a
							className="sr-only focus:not-sr-only focus:mb-1 focus:block focus:w-fit focus:text-sm focus:font-medium focus:text-fd-primary focus:underline"
							href={node.href}
							rel="noopener noreferrer"
							target="_blank"
						>
							Open unnumbered entry in {node.sourceLabel} (opens in a new tab)
						</a>
					)}
					<ContentBlocks blocks={node.content} nodeStatus={node.status} showMobileStatus={!hasLabel} />
				</>
			}
			label={label}
			nestedRules={node.children.length > 0 ? <ContextualRuleList items={node.children} nested /> : undefined}
			stackLabelOnMobile
			tone={nodeTone(node.status)}
			trailing={node.status ? <NodeStatus status={node.status} placement="desktop" /> : undefined}
		/>
	)
}

function ContextualRuleList({
	items,
	nested = false,
}: {
	items: readonly ContextualChangeNode[]
	nested?: boolean
}) {
	return (
		<RulesRuleListShell nested={nested}>
			{items.map((item) => item.kind === 'rule' && <RuleNode key={item.anchor} node={item} />)}
		</RulesRuleListShell>
	)
}

type ContextualNodeGroup =
	| { kind: 'rules'; key: string; items: readonly ContextualChangeNode[] }
	| { kind: 'heading'; key: string; item: ContextualChangeNode }

function groupContextualNodes(items: readonly ContextualChangeNode[]): ContextualNodeGroup[] {
	const groups: ContextualNodeGroup[] = []
	let rules: ContextualChangeNode[] = []
	const flushRules = () => {
		if (rules.length === 0) return
		groups.push({ kind: 'rules', key: `rules:${rules[0].anchor}`, items: rules })
		rules = []
	}
	for (const item of items) {
		if (item.kind === 'rule') rules.push(item)
		else {
			flushRules()
			groups.push({ kind: 'heading', key: item.anchor, item })
		}
	}
	flushRules()
	return groups
}

function ContextualNodeGroupView({
	family,
	group,
	nestedRules = false,
}: {
	family: RulesDocumentFamilyId
	group: ContextualNodeGroup
	nestedRules?: boolean
}) {
	return group.kind === 'rules' ? (
		<ContextualRuleList items={group.items} nested={nestedRules} />
	) : (
		<ContextualHeadingBranch family={family} node={group.item} />
	)
}

function ContextualHeadingBranch({
	family,
	node,
}: {
	family: RulesDocumentFamilyId
	node: ContextualChangeNode
}) {
	const groups = groupContextualNodes(node.children)
	if (node.headingDepth === 2) {
		const [firstGroup, ...remainingGroups] = groups
		const preamble = family === 'core-rules' && firstGroup?.kind === 'rules' ? firstGroup : undefined
		const bodyGroups = preamble ? remainingGroups : groups
		return (
			<section>
				<HeadingNode node={node} />
				{preamble && (
					<RulesSectionPreamble>
						<ContextualRuleList items={preamble.items} />
					</RulesSectionPreamble>
				)}
				{bodyGroups.length > 0 && (
					<RulesSectionBody>
						{bodyGroups.map((group) => (
							<ContextualNodeGroupView family={family} group={group} key={group.key} />
						))}
					</RulesSectionBody>
				)}
			</section>
		)
	}

	return (
		<section className="scroll-mt-20">
			<HeadingNode node={node} />
			{groups.map((group) => (
				<ContextualNodeGroupView
					family={family}
					group={group}
					key={group.key}
					nestedRules={family === 'tournament-rules'}
				/>
			))}
		</section>
	)
}

export function ContextualRulesChangeDocument({
	data,
	family,
}: {
	data: ContextualRulesChange
	family: RulesDocumentFamilyId
}) {
	const groups = groupContextualNodes(data.items)
	return (
		<RulesDocumentShell>
			{groups.map((group) => (
				<ContextualNodeGroupView family={family} group={group} key={group.key} />
			))}
		</RulesDocumentShell>
	)
}
