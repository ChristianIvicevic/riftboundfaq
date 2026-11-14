import { cva } from 'class-variance-authority'
import type { ReactNode } from 'react'
import styles from '@/components/rules/document.module.css'
import { cn } from '@/lib/cn'

export type RulesDocumentTone = 'neutral' | 'added' | 'deleted' | 'changed'

const headingVariants = cva(cn('core-rules-anchor scroll-mt-20', styles.heading), {
	variants: {
		depth: {
			section: styles.sectionHeading,
			subsection: styles.subsectionHeading,
		},
		tone: {
			neutral: '',
			added: 'border-l-2 border-l-green-300 bg-green-50/45 px-2 dark:border-l-green-900 dark:bg-green-950/15',
			deleted:
				'border-l-2 border-l-red-300 bg-red-50/55 px-2 text-fd-muted-foreground dark:border-l-red-900 dark:bg-red-950/15',
			changed:
				'border-l-2 border-l-amber-300 bg-amber-50/35 px-2 dark:border-l-amber-900 dark:bg-amber-950/10',
		},
	},
	defaultVariants: { tone: 'neutral' },
})

const ruleRowVariants = cva(cn('grid min-w-0 items-start wrap-anywhere', styles.row), {
	variants: {
		layout: {
			labeled: cn('grid-cols-[max-content_minmax(0,1fr)] gap-x-2', styles.labeledRow),
			'labeled-stacked': cn('grid-cols-1', styles.labeledRow),
			unlabeled: 'grid-cols-1 sm:grid-cols-[minmax(0,1fr)_max-content] sm:gap-x-4',
		},
		tone: {
			neutral: '',
			added: 'border-l-2 border-l-green-300 bg-green-50/45 px-2 dark:border-l-green-900 dark:bg-green-950/15',
			deleted:
				'border-l-2 border-l-red-300 bg-red-50/55 px-2 text-fd-muted-foreground dark:border-l-red-900 dark:bg-red-950/15',
			changed:
				'border-l-2 border-l-amber-300 bg-amber-50/35 px-2 dark:border-l-amber-900 dark:bg-amber-950/10',
		},
	},
	defaultVariants: { tone: 'neutral' },
})

const ruleListVariants = cva(cn('list-none', styles.ruleList), {
	variants: {
		nested: {
			true: styles.nestedRuleList,
			false: 'm-0 p-0',
		},
	},
})

const documentPresentationVariants = cva(styles.document, {
	variants: {
		leadingGap: {
			true: styles.leadingGap,
			false: null,
		},
	},
})

export function RulesDocumentPresentation({
	children,
	leadingGap = false,
}: {
	children: ReactNode
	leadingGap?: boolean
}) {
	return <div className={documentPresentationVariants({ leadingGap })}>{children}</div>
}

export function RulesDocumentShell({ children }: { children: ReactNode }) {
	return <div className={cn('not-prose', styles.rulesDocument)}>{children}</div>
}

export function RulesSectionPreamble({ children }: { children: ReactNode }) {
	return <div className={styles.preamble}>{children}</div>
}

export function RulesSectionBody({ children }: { children: ReactNode }) {
	return <div className={styles.sectionBody}>{children}</div>
}

export function RulesHeadingShell({
	children,
	depth,
	id,
	tone = 'neutral',
	trailing,
}: {
	children: ReactNode
	depth: 'section' | 'subsection'
	id?: string
	tone?: RulesDocumentTone
	trailing?: ReactNode
}) {
	const Heading = depth === 'section' ? 'h2' : 'h3'
	return (
		<Heading className={headingVariants({ depth, tone })} id={id}>
			{trailing ? (
				<span className="grid min-w-0 grid-cols-1 items-start sm:grid-cols-[minmax(0,1fr)_max-content] sm:gap-x-4">
					<span className="min-w-0">{children}</span>
					{trailing}
				</span>
			) : (
				children
			)}
		</Heading>
	)
}

export function RulesRuleListShell({ children, nested = false }: { children: ReactNode; nested?: boolean }) {
	return <ol className={ruleListVariants({ nested })}>{children}</ol>
}

export function RulesRuleLabelShell({ children }: { children: ReactNode }) {
	return <span className={cn('flex items-center gap-2', styles.ruleLabel)}>{children}</span>
}

export function RulesRuleShell({
	content,
	id,
	label,
	nestedRules,
	stackLabelOnMobile = false,
	tone = 'neutral',
	trailing,
}: {
	content: ReactNode
	id?: string
	label?: ReactNode
	nestedRules?: ReactNode
	stackLabelOnMobile?: boolean
	tone?: RulesDocumentTone
	trailing?: ReactNode
}) {
	const labeled = label !== undefined && label !== null
	const layout = labeled ? (stackLabelOnMobile ? 'labeled-stacked' : 'labeled') : 'unlabeled'
	return (
		<li className={cn('core-rules-anchor scroll-mt-20', styles.rule)} id={id}>
			<div className={ruleRowVariants({ layout, tone })}>
				{label}
				<div className={cn('space-y-2 leading-6 wrap-anywhere', styles.content)}>{content}</div>
				{trailing}
			</div>
			{nestedRules}
		</li>
	)
}
