import { Fragment, type ReactNode } from 'react'
import { Indent } from '@/components/rules/indent'
import { RuleAnchor } from '@/components/rules/rule-anchor'
import type { RuleRecord, RuleReference } from '@/components/rules/types'

type FindRuleReferences = (text: string, ruleIds: ReadonlySet<string>) => RuleReference[]

function RuleText({
	text,
	ruleIds,
	findReferences,
}: {
	text: string
	ruleIds: ReadonlySet<string>
	findReferences: FindRuleReferences
}): ReactNode {
	const references = findReferences(text, ruleIds)
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

function RuleLines({
	lines,
	ruleIds,
	findReferences,
}: {
	lines: string[]
	ruleIds: ReadonlySet<string>
	findReferences: FindRuleReferences
}) {
	return (
		<>
			{lines.map((line, index) => (
				<Fragment key={index}>
					{index > 0 && <br />}
					<RuleText text={line} ruleIds={ruleIds} findReferences={findReferences} />
				</Fragment>
			))}
		</>
	)
}

export function RulesTable({
	rules,
	findReferences,
}: {
	rules: RuleRecord[]
	findReferences: FindRuleReferences
}) {
	const ruleIds = new Set(rules.map((rule) => rule.id))

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
					{rules.map((rule) => {
						const level = rule.id.split('.').length - 1
						const lines = <RuleLines lines={rule.lines} ruleIds={ruleIds} findReferences={findReferences} />
						return (
							<tr key={rule.id}>
								<td className="align-top whitespace-nowrap">
									<RuleAnchor id={`R${rule.id}`}>{rule.id}</RuleAnchor>
								</td>
								<td>{level > 0 ? <Indent level={level}>{lines}</Indent> : lines}</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}
