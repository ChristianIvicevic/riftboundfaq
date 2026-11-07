import { cva } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type RulesDocumentTone = 'neutral' | 'added' | 'deleted' | 'changed'

const headingVariants = cva(
	'core-rules-anchor scroll-mt-20 font-semibold tracking-tight target:border-l-2 target:border-l-sky-600 target:bg-sky-500/10 target:pr-2 target:pl-3 dark:target:border-l-sky-400',
	{
		variants: {
			depth: {
				section: 'border-b border-fd-border py-3 text-2xl sm:text-3xl',
				subsection: 'mb-4 py-2 text-xl sm:text-2xl',
			},
			tone: {
				neutral: '',
				added: 'border-l-2 border-l-green-300 bg-green-50/45 dark:border-l-green-900 dark:bg-green-950/15',
				deleted:
					'border-l-2 border-l-red-300 bg-red-50/55 text-fd-muted-foreground dark:border-l-red-900 dark:bg-red-950/15',
				changed: 'border-l-2 border-l-amber-300 bg-amber-50/35 dark:border-l-amber-900 dark:bg-amber-950/10',
			},
		},
		defaultVariants: { tone: 'neutral' },
	},
)

const ruleRowVariants = cva('grid min-w-0 items-start py-1.5 wrap-anywhere', {
	variants: {
		labeled: {
			true: 'grid-cols-[max-content_minmax(0,1fr)] gap-x-2 sm:grid-cols-[max-content_minmax(0,1fr)_max-content] sm:gap-x-4',
			false: 'grid-cols-1 sm:grid-cols-[minmax(0,1fr)_max-content] sm:gap-x-4',
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

export function RulesDocumentShell({ children }: { children: ReactNode }) {
	return <div className="not-prose mt-8 space-y-14">{children}</div>
}

export function RulesSectionPreamble({ children }: { children: ReactNode }) {
	return <div className="mt-6">{children}</div>
}

export function RulesSectionBody({ children }: { children: ReactNode }) {
	return <div className="mt-6 space-y-10">{children}</div>
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
	return (
		<ol
			className={
				nested
					? 'mt-2 ml-2 list-none space-y-2 border-l border-fd-border pl-2 sm:ml-5 sm:pl-5'
					: 'm-0 list-none space-y-2 p-0'
			}
		>
			{children}
		</ol>
	)
}

export function RulesRuleShell({
	content,
	id,
	label,
	nestedRules,
	tone = 'neutral',
	trailing,
}: {
	content: ReactNode
	id?: string
	label?: ReactNode
	nestedRules?: ReactNode
	tone?: RulesDocumentTone
	trailing?: ReactNode
}) {
	const labeled = label !== undefined && label !== null
	return (
		<li
			className="core-rules-anchor scroll-mt-20 target:border-l-2 target:border-l-sky-600 target:bg-sky-500/10 target:pr-2 target:pl-3 dark:target:border-l-sky-400"
			id={id}
		>
			<div className={cn(ruleRowVariants({ labeled, tone }))}>
				{label}
				<div className="min-w-0 space-y-2 leading-6 wrap-anywhere">{content}</div>
				{trailing}
			</div>
			{nestedRules}
		</li>
	)
}
