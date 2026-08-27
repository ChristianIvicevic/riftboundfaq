import { cva } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { rulesDocuments } from '@/features/rules-documents/registry'
import type {
	PreparedRulesChange,
	PreparedRulesChangeEntry,
	PreparedRulesChangeRule,
	PreparedRulesChangeText,
} from '@/features/rules-documents/rules-change'
import { cn } from '@/lib/cn'

type ChangeStatus = 'added' | 'removed' | 'changed'

const CHANGE_STATUS_LABELS = {
	added: 'Added',
	removed: 'Removed',
	changed: 'Changed',
} satisfies Record<ChangeStatus, string>

const statusPillVariants = cva('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', {
	variants: {
		status: {
			neutral:
				'border-fd-border bg-fd-muted text-fd-foreground dark:border-zinc-500 dark:bg-zinc-700 dark:text-zinc-100',
			added:
				'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200',
			removed: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200',
			changed:
				'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
		},
	},
})

const diffCellVariants = cva(
	'block min-w-0 px-3 py-3 text-left font-normal align-top wrap-anywhere lg:table-cell lg:px-4 lg:py-4',
	{
		variants: {
			tone: {
				added: 'bg-green-50/70 dark:bg-green-950/20',
				removed: 'bg-red-50/70 dark:bg-red-950/20',
				changed: 'bg-amber-50/40 dark:bg-amber-950/10',
			},
		},
	},
)

function DiffText({ text }: { text: PreparedRulesChangeText }): ReactNode {
	if (text.type === 'same') return text.text
	if (text.type === 'remove') {
		return (
			<del className="rounded-sm bg-red-100 px-0.5 font-semibold text-red-900 line-through decoration-red-700 dark:bg-red-600/95 dark:text-white dark:decoration-white">
				{text.text}
			</del>
		)
	}
	return (
		<ins className="rounded-sm bg-green-100 px-0.5 font-semibold text-green-900 no-underline dark:bg-green-700/95 dark:text-white">
			{text.text}
		</ins>
	)
}

function DiffTextSequence({ text }: { text: readonly PreparedRulesChangeText[] }) {
	return text.map((segment, index) => <DiffText key={index} text={segment} />)
}

function RuleLink({ rule, versionLabel }: { rule: PreparedRulesChangeRule; versionLabel: string }) {
	return (
		<a
			aria-label={`${rule.label} in ${versionLabel} (opens in a new tab)`}
			href={rule.href}
			rel="noopener noreferrer"
			target="_blank"
			className="block w-fit font-mono text-sm leading-6 font-medium whitespace-nowrap underline decoration-fd-primary/30 underline-offset-2 hover:decoration-fd-primary"
		>
			{rule.label}
		</a>
	)
}

function ChangeBadge({ status }: { status: ChangeStatus }) {
	return (
		<span className={cn(statusPillVariants({ status }), 'px-2 py-0.5')}>{CHANGE_STATUS_LABELS[status]}</span>
	)
}

function VersionCellLabel({ side, versionLabel }: { side: 'Before' | 'After'; versionLabel: string }) {
	return (
		<div className="mb-2 border-b border-fd-border pb-1 lg:hidden">
			<div className="text-[0.625rem] leading-3 font-semibold tracking-wide text-fd-muted-foreground uppercase">
				{side}
			</div>
			<div className="text-sm leading-5 font-semibold text-fd-foreground">{versionLabel}</div>
		</div>
	)
}

const ROW_CLASS_NAME =
	'mb-3 block overflow-hidden rounded-lg border border-fd-border bg-fd-background lg:table-row lg:rounded-none lg:border-0'
const ROW_HEADER_CLASS_NAME =
	'block bg-fd-muted/40 px-3 py-2.5 text-left font-normal align-top lg:table-cell lg:py-4'

function ChangeRowHeader({ status, renumbered = false }: { status: ChangeStatus; renumbered?: boolean }) {
	return (
		<th scope="row" className={ROW_HEADER_CLASS_NAME}>
			<div className="flex flex-wrap items-center gap-2">
				<ChangeBadge status={status} />
				{renumbered && (
					<span className={cn(statusPillVariants({ status: 'neutral' }), 'px-2 py-0.5')}>Renumbered</span>
				)}
			</div>
		</th>
	)
}

function MissingVersionCell({ versionLabel }: { versionLabel: string }) {
	return (
		<td className="hidden bg-fd-muted/30 align-top lg:table-cell">
			<span className="sr-only">Not present in {versionLabel}</span>
		</td>
	)
}

function DiffRow({
	entry,
	fromLabel,
	toLabel,
}: {
	entry: PreparedRulesChangeEntry
	fromLabel: string
	toLabel: string
}) {
	if (entry.kind === 'added') {
		return (
			<tr className={ROW_CLASS_NAME}>
				<ChangeRowHeader status="added" />
				<MissingVersionCell versionLabel={fromLabel} />
				<td className={diffCellVariants({ tone: 'added' })}>
					<VersionCellLabel side="After" versionLabel={toLabel} />
					<RuleLink rule={entry.rule} versionLabel={toLabel} />
					<ins className="block text-fd-foreground no-underline">
						<span className="sr-only">Added: </span>
						{entry.rule.lines.join(' ')}
					</ins>
				</td>
			</tr>
		)
	}

	if (entry.kind === 'removed') {
		return (
			<tr className={ROW_CLASS_NAME}>
				<ChangeRowHeader status="removed" />
				<td className={diffCellVariants({ tone: 'removed' })}>
					<VersionCellLabel side="Before" versionLabel={fromLabel} />
					<RuleLink rule={entry.rule} versionLabel={fromLabel} />
					<del className="block text-fd-foreground/75 line-through dark:text-fd-muted-foreground">
						<span className="sr-only">Removed: </span>
						{entry.rule.lines.join(' ')}
					</del>
				</td>
				<MissingVersionCell versionLabel={toLabel} />
			</tr>
		)
	}

	return (
		<tr className={ROW_CLASS_NAME}>
			<ChangeRowHeader status="changed" renumbered={entry.oldRule.label !== entry.newRule.label} />
			<td className={diffCellVariants({ tone: 'changed' })}>
				<VersionCellLabel side="Before" versionLabel={fromLabel} />
				<RuleLink rule={entry.oldRule} versionLabel={fromLabel} />
				<div className="text-fd-foreground">
					<DiffTextSequence text={entry.oldText} />
				</div>
			</td>
			<td className={diffCellVariants({ tone: 'changed' })}>
				<VersionCellLabel side="After" versionLabel={toLabel} />
				<RuleLink rule={entry.newRule} versionLabel={toLabel} />
				<div className="text-fd-foreground">
					<DiffTextSequence text={entry.newText} />
				</div>
			</td>
		</tr>
	)
}

export function RulesChangeView({ change }: { change: PreparedRulesChange }) {
	const { entries, from, to } = change
	const counts = { added: 0, removed: 0, modified: 0 }
	for (const entry of entries) counts[entry.kind]++
	return (
		<div className="relative my-6 prose-no-margin">
			<ul aria-label="Change summary" className="not-prose mb-3 flex flex-wrap gap-2 text-sm">
				<li className={statusPillVariants({ status: 'neutral' })}>
					{entries.length} {entries.length === 1 ? 'change' : 'changes'}
				</li>
				<li className={statusPillVariants({ status: 'added' })}>{counts.added} added</li>
				<li className={statusPillVariants({ status: 'removed' })}>{counts.removed} removed</li>
				<li className={statusPillVariants({ status: 'changed' })}>{counts.modified} changed</li>
			</ul>
			<p className="mb-4 text-sm text-fd-muted-foreground">
				Routine renumbering and reference-only updates are omitted.
			</p>
			<table className="block w-full border-separate border-spacing-0 text-sm max-lg:overflow-visible! max-lg:rounded-none! max-lg:border-0! max-lg:bg-transparent! lg:table lg:table-fixed lg:overflow-visible!">
				<caption className="sr-only">
					Changes from {from.label} to {to.label}
				</caption>
				<colgroup className="hidden lg:table-column-group">
					<col className="w-40" />
					<col />
					<col />
				</colgroup>
				<thead className="sr-only lg:not-sr-only lg:table-header-group">
					<tr>
						<th
							scope="col"
							className="sticky top-0 z-10 border-b border-fd-border bg-fd-background/95 px-3 py-3 text-left align-bottom backdrop-blur"
						>
							Change
						</th>
						<th
							scope="col"
							aria-label={`Before ${from.label}`}
							className="sticky top-0 z-10 border-b border-fd-border bg-fd-background/95 px-4 py-3 text-left align-bottom backdrop-blur"
						>
							<span className="block text-xs font-semibold tracking-wide text-fd-muted-foreground uppercase">
								Before
							</span>
							<span className="text-sm">{from.label}</span>
						</th>
						<th
							scope="col"
							aria-label={`After ${to.label}`}
							className="sticky top-0 z-10 border-b border-fd-border bg-fd-background/95 px-4 py-3 text-left align-bottom backdrop-blur"
						>
							<span className="block text-xs font-semibold tracking-wide text-fd-muted-foreground uppercase">
								After
							</span>
							<span className="text-sm">{to.label}</span>
						</th>
					</tr>
				</thead>
				<tbody className="block space-y-3 lg:table-row-group lg:space-y-0">
					{entries.map((entry, index) => {
						const id = entry.kind === 'modified' ? entry.newRule.id : entry.rule.id
						return (
							<DiffRow
								key={`${entry.kind}:${id}:${index}`}
								entry={entry}
								fromLabel={from.label}
								toLabel={to.label}
							/>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}

export function CoreRulesDiff({ from, to }: { from: string; to: string }) {
	return <RulesChangeView change={rulesDocuments.change({ type: 'core-rules', from, to })} />
}

export function TournamentRulesDiff({ from, to }: { from: string; to: string }) {
	return <RulesChangeView change={rulesDocuments.change({ type: 'tournament-rules', from, to })} />
}
