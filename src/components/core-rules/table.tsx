import { Fragment, type ReactNode } from 'react'
import { CORE_RULES } from '@/components/core-rules/data'
import { Indent } from '@/components/core-rules/indent'
import { RuleAnchor } from '@/components/core-rules/rule-anchor'

const RULE_IDS = new Set(CORE_RULES.map((rule) => rule.id))
const RULE_REFERENCE = /\brules?\s+(\d{3}(?:\.[0-9a-z]+)*)/giu

function RuleText({ text }: { text: string }): ReactNode {
	const nodes: ReactNode[] = []
	let cursor = 0

	for (const match of text.matchAll(RULE_REFERENCE)) {
		const id = match[1]
		if (!RULE_IDS.has(id)) continue

		const start = match.index
		nodes.push(
			text.slice(cursor, start),
			<a key={start} href={`#${id}`}>
				{match[0]}
			</a>,
		)
		cursor = start + match[0].length
	}

	if (cursor === 0) return text
	nodes.push(text.slice(cursor))
	return nodes
}

function Lines({ lines }: { lines: string[] }) {
	return (
		<>
			{lines.map((line, index) => (
				<Fragment key={index}>
					{index > 0 && <br />}
					<RuleText text={line} />
				</Fragment>
			))}
		</>
	)
}

export function CoreRulesTable() {
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
					{CORE_RULES.map((rule) => (
						<tr key={rule.id}>
							<td className="align-top whitespace-nowrap">
								<RuleAnchor id={rule.id}>{rule.id}.</RuleAnchor>
							</td>
							<td>
								{rule.level > 0 ? (
									<Indent level={rule.level}>
										<Lines lines={rule.lines} />
									</Indent>
								) : (
									<Lines lines={rule.lines} />
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
