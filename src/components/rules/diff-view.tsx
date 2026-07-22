import { Fragment, type ReactNode } from 'react'
import type { DiffEntry, Token } from '@/components/rules/diff'

function DiffToken({ token }: { token: Token }): ReactNode {
	if (token.type === 'same') return token.text
	if (token.type === 'remove') {
		return <del className="font-bold text-fd-diff-remove-symbol line-through">{token.text}</del>
	}
	return <ins className="bg-fd-diff-add-symbol font-bold text-fd-background no-underline">{token.text}</ins>
}

function DiffTokens({ tokens }: { tokens: Token[] }) {
	return tokens.map((token, index) => <DiffToken key={index} token={token} />)
}

function RuleLink({ href, label, ruleId }: { href: string; label: string; ruleId: string }) {
	return (
		<>
			<div className="text-xs font-medium text-fd-muted-foreground sm:hidden">{label}</div>
			<a href={href} rel="noopener noreferrer" target="_blank" className="text-nowrap no-underline">
				<strong className="font-bold">{ruleId}</strong>
			</a>
		</>
	)
}

function DiffRow({
	entry,
	from,
	to,
	fromLabel,
	toLabel,
	ruleHref,
}: {
	entry: DiffEntry
	from: string
	to: string
	fromLabel: string
	toLabel: string
	ruleHref: (ruleId: string, version: string) => string
}) {
	if (entry.kind === 'added') {
		return (
			<>
				<div className="hidden sm:block" />
				<div>
					<RuleLink href={ruleHref(entry.rule.id, to)} ruleId={entry.rule.id} label={toLabel} />
					<ins className="block text-fd-diff-add-symbol no-underline">
						<span className="sr-only">Added: </span>
						{entry.rule.lines.join(' ')}
					</ins>
				</div>
			</>
		)
	}

	if (entry.kind === 'removed') {
		return (
			<>
				<div>
					<RuleLink href={ruleHref(entry.rule.id, from)} ruleId={entry.rule.id} label={fromLabel} />
					<del className="block text-fd-diff-remove-symbol no-underline">
						<span className="sr-only">Removed: </span>
						{entry.rule.lines.join(' ')}
					</del>
				</div>
				<div className="hidden sm:block" />
			</>
		)
	}

	return (
		<>
			<div className="mb-4 sm:mb-0">
				<RuleLink href={ruleHref(entry.oldId, from)} ruleId={entry.oldId} label={fromLabel} />
				<div>
					<DiffTokens tokens={entry.oldText} />
				</div>
			</div>
			<div>
				<RuleLink href={ruleHref(entry.newId, to)} ruleId={entry.newId} label={toLabel} />
				<div>
					<DiffTokens tokens={entry.newText} />
				</div>
			</div>
		</>
	)
}

export function RulesDiffView({
	entries,
	from,
	to,
	fromLabel,
	toLabel,
	ruleHref,
}: {
	entries: DiffEntry[]
	from: string
	to: string
	fromLabel: string
	toLabel: string
	ruleHref: (ruleId: string, version: string) => string
}) {
	return (
		<div className="grid flex-1 grid-cols-1 gap-x-8 gap-y-2 pb-20 sm:grid-cols-2">
			<div className="mb-4 text-center text-sm font-medium sm:hidden">
				Comparing <span className="text-fd-diff-remove-symbol">{fromLabel}</span> to{' '}
				<span className="text-fd-diff-add-symbol">{toLabel}</span>
			</div>
			<div className="hidden text-center sm:block">
				<h2 className="mt-2! mb-8! font-serif text-3xl font-bold text-fd-diff-remove-symbol">{fromLabel}</h2>
			</div>
			<div className="hidden text-center sm:block">
				<h2 className="mt-2! mb-8! font-serif text-3xl font-bold text-fd-diff-add-symbol">{toLabel}</h2>
			</div>

			{entries.map((entry, index) => {
				const id = entry.kind === 'modified' ? entry.newId : entry.rule.id
				return (
					<Fragment key={`${entry.kind}:${id}`}>
						{index > 0 && <hr className="col-span-1 my-4! border-b border-t-transparent sm:col-span-2" />}
						<DiffRow
							entry={entry}
							from={from}
							to={to}
							fromLabel={fromLabel}
							toLabel={toLabel}
							ruleHref={ruleHref}
						/>
					</Fragment>
				)
			})}
		</div>
	)
}
