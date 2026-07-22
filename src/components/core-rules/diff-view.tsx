import { Fragment, type ReactNode } from 'react'
import { CRD_VERSIONS } from '@/components/core-rules/data'
import { type DiffEntry, diffRuleSets, type Token } from '@/components/core-rules/diff'
import { ruleHref } from '@/lib/constants'

const VERSIONS = Object.keys(CRD_VERSIONS)

function DiffToken({ token }: { token: Token }): ReactNode {
	if (token.type === 'same') return token.text
	if (token.type === 'remove') {
		return <span className="font-bold text-fd-diff-remove-symbol line-through">{token.text}</span>
	}
	return <span className="bg-fd-diff-add-symbol font-bold text-fd-background">{token.text}</span>
}

function DiffTokens({ tokens }: { tokens: Token[] }) {
	return tokens.map((token, index) => <DiffToken key={index} token={token} />)
}

function RuleLink({ ruleId, version, label }: { ruleId: string; version: string; label: string }) {
	return (
		<>
			<div className="text-xs font-medium text-fd-muted-foreground sm:hidden">{label}</div>
			<a
				href={ruleHref(ruleId, version)}
				rel="noopener noreferrer"
				target="_blank"
				className="text-nowrap no-underline"
			>
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
}: {
	entry: DiffEntry
	from: string
	to: string
	fromLabel: string
	toLabel: string
}) {
	if (entry.kind === 'added') {
		return (
			<>
				<div className="hidden sm:block" />
				<div>
					<RuleLink ruleId={entry.rule.id} version={to} label={toLabel} />
					<div className="text-fd-diff-add-symbol">{entry.rule.lines.join(' ')}</div>
				</div>
			</>
		)
	}

	if (entry.kind === 'removed') {
		return (
			<>
				<div>
					<RuleLink ruleId={entry.rule.id} version={from} label={fromLabel} />
					<div className="text-fd-diff-remove-symbol">{entry.rule.lines.join(' ')}</div>
				</div>
				<div className="hidden sm:block" />
			</>
		)
	}

	return (
		<>
			<div className="mb-4 sm:mb-0">
				<RuleLink ruleId={entry.oldId} version={from} label={fromLabel} />
				<div>
					<DiffTokens tokens={entry.oldText} />
				</div>
			</div>
			<div>
				<RuleLink ruleId={entry.newId} version={to} label={toLabel} />
				<div>
					<DiffTokens tokens={entry.newText} />
				</div>
			</div>
		</>
	)
}

type CoreRulesDiffProps = {
	from?: string
	to?: string
}

export function CoreRulesDiff({ from = VERSIONS.at(-2), to = VERSIONS.at(-1) }: CoreRulesDiffProps) {
	const oldVersion = from ? CRD_VERSIONS[from] : undefined
	const newVersion = to ? CRD_VERSIONS[to] : undefined
	if (!oldVersion) throw new Error(`CoreRulesDiff: unknown "from" version ${JSON.stringify(from)}`)
	if (!newVersion) throw new Error(`CoreRulesDiff: unknown "to" version ${JSON.stringify(to)}`)

	const entries = diffRuleSets(oldVersion.rules, newVersion.rules)

	return (
		<div className="grid flex-1 grid-cols-1 gap-x-8 gap-y-2 pb-20 sm:grid-cols-2">
			<div className="mb-4 text-center text-sm font-medium sm:hidden">
				Comparing <span className="text-fd-diff-remove-symbol">{oldVersion.name}</span> to{' '}
				<span className="text-fd-diff-add-symbol">{newVersion.name}</span>
			</div>
			<div className="hidden text-center sm:block">
				<h2 className="mt-2! mb-8! font-serif text-3xl font-bold text-fd-diff-remove-symbol">
					{oldVersion.name}
				</h2>
			</div>
			<div className="hidden text-center sm:block">
				<h2 className="mt-2! mb-8! font-serif text-3xl font-bold text-fd-diff-add-symbol">
					{newVersion.name}
				</h2>
			</div>

			{entries.map((entry, index) => {
				const id = entry.kind === 'modified' ? entry.newId : entry.rule.id
				return (
					<Fragment key={`${entry.kind}:${id}`}>
						{index > 0 && <hr className="col-span-1 my-4! border-b border-t-transparent sm:col-span-2" />}
						<DiffRow
							entry={entry}
							from={oldVersion.version}
							to={newVersion.version}
							fromLabel={oldVersion.name}
							toLabel={newVersion.name}
						/>
					</Fragment>
				)
			})}
		</div>
	)
}
