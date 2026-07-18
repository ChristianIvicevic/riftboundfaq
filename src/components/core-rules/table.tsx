import { Fragment, type ReactNode } from 'react'
import { CRD_VERSIONS } from '@/components/core-rules/data'
import { Indent } from '@/components/core-rules/indent'
import { RuleAnchor } from '@/components/core-rules/rule-anchor'
import { CURRENT_CRD_VERSION } from '@/lib/constants'

const RULE_REFERENCE = /\brules?\s+(\d{3}(?:\.[0-9a-z]+)*)/giu

function RuleText({ text, ruleIds }: { text: string; ruleIds: Set<string> }): ReactNode {
	const nodes: ReactNode[] = []
	let cursor = 0

	for (const match of text.matchAll(RULE_REFERENCE)) {
		const id = match[1]
		if (!ruleIds.has(id)) continue

		const start = match.index
		nodes.push(
			text.slice(cursor, start),
			<a key={start} href={`#R${id}`}>
				{match[0]}
			</a>,
		)
		cursor = start + match[0].length
	}

	if (cursor === 0) return text
	nodes.push(text.slice(cursor))
	return nodes
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

export function CoreRulesTable({ version = CURRENT_CRD_VERSION }: { version?: string }) {
	const crd = CRD_VERSIONS[version]
	if (!crd) throw new Error(`CoreRulesTable: unknown version ${JSON.stringify(version)}`)

	const ruleIds = new Set(crd.rules.map((rule) => rule.id))

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
					{crd.rules.map((rule) => (
						<tr key={rule.id}>
							<td className="align-top whitespace-nowrap">
								<RuleAnchor id={`R${rule.id}`}>{rule.id}</RuleAnchor>
							</td>
							<td>
								{rule.level > 0 ? (
									<Indent level={rule.level}>
										<RuleLines lines={rule.lines} ruleIds={ruleIds} />
									</Indent>
								) : (
									<RuleLines lines={rule.lines} ruleIds={ruleIds} />
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
