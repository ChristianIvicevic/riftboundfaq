import { Fragment, type ReactNode } from 'react'
import { rulesDocuments } from '@/features/rules-documents/registry'
import type {
	PreparedRulesChange,
	PreparedRulesChangeEntry,
	PreparedRulesChangeRule,
	PreparedRulesChangeText,
} from '@/features/rules-documents/rules-change'

function DiffText({ text }: { text: PreparedRulesChangeText }): ReactNode {
	if (text.type === 'same') return text.text
	if (text.type === 'remove') {
		return <del className="font-bold text-fd-diff-remove-symbol line-through">{text.text}</del>
	}
	return <ins className="bg-fd-diff-add-symbol font-bold text-fd-background no-underline">{text.text}</ins>
}

function DiffTextSequence({ text }: { text: readonly PreparedRulesChangeText[] }) {
	return text.map((segment, index) => <DiffText key={index} text={segment} />)
}

function RuleLink({ rule, versionLabel }: { rule: PreparedRulesChangeRule; versionLabel: string }) {
	return (
		<>
			<div className="text-xs font-medium text-fd-muted-foreground sm:hidden">{versionLabel}</div>
			<a
				href={rule.href}
				rel="noopener noreferrer"
				target="_blank"
				className="font-mono text-sm leading-6 font-medium whitespace-nowrap no-underline"
			>
				<span>{rule.label}</span>
			</a>
		</>
	)
}

function DiffRow({
	entry,
	fromLabel,
	toLabel,
	includeChangeDescriptions,
}: {
	entry: PreparedRulesChangeEntry
	fromLabel: string
	toLabel: string
	includeChangeDescriptions: boolean
}) {
	if (entry.kind === 'added') {
		return (
			<>
				<div className="hidden sm:block" />
				<div>
					<RuleLink rule={entry.rule} versionLabel={toLabel} />
					{includeChangeDescriptions ? (
						<ins className="block text-fd-diff-add-symbol no-underline">
							<span className="sr-only">Added: </span>
							{entry.rule.lines.join(' ')}
						</ins>
					) : (
						<ins className="block text-fd-diff-add-symbol no-underline">{entry.rule.lines.join(' ')}</ins>
					)}
				</div>
			</>
		)
	}

	if (entry.kind === 'removed') {
		return (
			<>
				<div>
					<RuleLink rule={entry.rule} versionLabel={fromLabel} />
					{includeChangeDescriptions ? (
						<del className="block text-fd-diff-remove-symbol no-underline">
							<span className="sr-only">Removed: </span>
							{entry.rule.lines.join(' ')}
						</del>
					) : (
						<del className="block text-fd-diff-remove-symbol no-underline">{entry.rule.lines.join(' ')}</del>
					)}
				</div>
				<div className="hidden sm:block" />
			</>
		)
	}

	return (
		<>
			<div className="mb-4 sm:mb-0">
				<RuleLink rule={entry.oldRule} versionLabel={fromLabel} />
				<div>
					<DiffTextSequence text={entry.oldText} />
				</div>
			</div>
			<div>
				<RuleLink rule={entry.newRule} versionLabel={toLabel} />
				<div>
					<DiffTextSequence text={entry.newText} />
				</div>
			</div>
		</>
	)
}

export function RulesChangeView({
	change,
	includeChangeDescriptions = true,
}: {
	change: PreparedRulesChange
	includeChangeDescriptions?: boolean
}) {
	const { entries, from, to } = change
	return (
		<div className="grid flex-1 grid-cols-1 gap-x-8 gap-y-2 pb-20 sm:grid-cols-2">
			<div className="mb-4 text-center text-sm font-medium sm:hidden">
				Comparing <span className="text-fd-diff-remove-symbol">{from.label}</span> to{' '}
				<span className="text-fd-diff-add-symbol">{to.label}</span>
			</div>
			<div className="hidden text-center sm:block">
				<h2 className="mt-2! mb-8! font-serif text-3xl font-bold text-fd-diff-remove-symbol">{from.label}</h2>
			</div>
			<div className="hidden text-center sm:block">
				<h2 className="mt-2! mb-8! font-serif text-3xl font-bold text-fd-diff-add-symbol">{to.label}</h2>
			</div>

			{entries.map((entry, index) => {
				const id = entry.kind === 'modified' ? entry.newRule.id : entry.rule.id
				return (
					<Fragment key={`${entry.kind}:${id}:${index}`}>
						{index > 0 && <hr className="col-span-1 my-4! border-b border-t-transparent sm:col-span-2" />}
						<DiffRow
							entry={entry}
							fromLabel={from.label}
							toLabel={to.label}
							includeChangeDescriptions={includeChangeDescriptions}
						/>
					</Fragment>
				)
			})}
		</div>
	)
}

export function CoreRulesDiff({ from, to }: { from: string; to: string }) {
	return <RulesChangeView change={rulesDocuments.change({ type: 'core-rules', from, to })} />
}

export function TournamentRulesDiff({
	from,
	to,
	includeChangeDescriptions = false,
}: {
	from: string
	to: string
	includeChangeDescriptions?: boolean
}) {
	return (
		<RulesChangeView
			change={rulesDocuments.change({ type: 'tournament-rules', from, to })}
			includeChangeDescriptions={includeChangeDescriptions}
		/>
	)
}
