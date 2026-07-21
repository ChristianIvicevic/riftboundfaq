import { Fragment, type ReactNode } from 'react'
import { Indent } from '@/components/rules/indent'
import { RuleAnchor } from '@/components/rules/rule-anchor'
import { TOURNAMENT_RULES_VERSIONS } from '@/components/tournament-rules/data'
import { findTournamentRuleReferences } from '@/components/tournament-rules/references'
import { CURRENT_TOURNAMENT_RULES_VERSION } from '@/lib/constants'

function RuleText({ text, ruleIds }: { text: string; ruleIds: Set<string> }): ReactNode {
	const references = findTournamentRuleReferences(text, ruleIds)
	if (references.length === 0) return text

	const nodes: ReactNode[] = []
	let cursor = 0

	for (const reference of references) {
		nodes.push(
			text.slice(cursor, reference.start),
			<a key={reference.start} href={`#R${reference.id}`}>
				{text.slice(reference.start, reference.end)}
			</a>,
		)
		cursor = reference.end
	}

	return [...nodes, text.slice(cursor)]
}

function RuleLines({ lines, ruleIds }: { lines: string[]; ruleIds: Set<string> }) {
	return (
		<>
			{lines.map((line, index) => (
				<Fragment key={index}>
					{index > 0 && <br />}
					<RuleText text={line} ruleIds={ruleIds} />
				</Fragment>
			))}
		</>
	)
}

export function TournamentRulesTable({ version = CURRENT_TOURNAMENT_RULES_VERSION }: { version?: string }) {
	const tournamentRules = TOURNAMENT_RULES_VERSIONS[version]
	if (!tournamentRules) throw new Error(`TournamentRulesTable: unknown version ${JSON.stringify(version)}`)

	const ruleIds = new Set(tournamentRules.rules.map((rule) => rule.id))

	return (
		<div className="overflow-x-auto">
			<table>
				<thead>
					<tr>
						<th>Rule</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					{tournamentRules.rules.map((rule) => {
						const level = rule.id.split('.').length - 1
						return (
							<tr key={rule.id}>
								<td className="align-top whitespace-nowrap">
									<RuleAnchor id={`R${rule.id}`}>{rule.id}</RuleAnchor>
								</td>
								<td>
									{level > 0 ? (
										<Indent level={level}>
											<RuleLines lines={rule.lines} ruleIds={ruleIds} />
										</Indent>
									) : (
										<RuleLines lines={rule.lines} ruleIds={ruleIds} />
									)}
								</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}
