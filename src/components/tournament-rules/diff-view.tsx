import { Fragment, type ReactNode } from 'react'
import { type DiffEntry, diffRuleSets, type Token } from '@/components/rules/diff'
import { TOURNAMENT_RULES_VERSIONS } from '@/components/tournament-rules/data'
import { tournamentRuleHref } from '@/lib/constants'

const VERSIONS = Object.keys(TOURNAMENT_RULES_VERSIONS).toSorted()

function formatVersion(version: string) {
	return new Intl.DateTimeFormat('en-US', {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC',
	}).format(new Date(`${version}T00:00:00Z`))
}

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
				href={tournamentRuleHref(ruleId, version)}
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
			<div>
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

type TournamentRulesDiffProps = {
	from?: string
	to?: string
}

export function TournamentRulesDiff({
	from = VERSIONS.at(-2),
	to = VERSIONS.at(-1),
}: TournamentRulesDiffProps) {
	const oldVersion = from ? TOURNAMENT_RULES_VERSIONS[from] : undefined
	const newVersion = to ? TOURNAMENT_RULES_VERSIONS[to] : undefined
	if (!oldVersion) throw new Error(`TournamentRulesDiff: unknown "from" version ${JSON.stringify(from)}`)
	if (!newVersion) throw new Error(`TournamentRulesDiff: unknown "to" version ${JSON.stringify(to)}`)

	const entries = diffRuleSets(oldVersion.rules, newVersion.rules, {
		hideRenumbering: true,
		hideReferenceOnlyChanges: false,
		prioritizeTextSimilarity: true,
	})
	const fromLabel = formatVersion(oldVersion.version)
	const toLabel = formatVersion(newVersion.version)

	return (
		<div className="grid flex-1 grid-cols-1 gap-x-8 gap-y-2 pb-20 text-fd-muted-foreground sm:grid-cols-2">
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
							from={oldVersion.version}
							to={newVersion.version}
							fromLabel={fromLabel}
							toLabel={toLabel}
						/>
					</Fragment>
				)
			})}
		</div>
	)
}
