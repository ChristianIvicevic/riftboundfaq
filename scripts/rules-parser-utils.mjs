/** Serialize rules in the generated data files' one-rule-per-line format. */
export function serializeRuleRecords(rules, exportName) {
	const body = rules
		.map((rule) => {
			const lines = rule.lines.map((line) => JSON.stringify(line)).join(', ')
			return `\t{"id": ${JSON.stringify(rule.id)}, "lines": [${lines}]},`
		})
		.join('\n')

	return `import type { RuleRecord } from '@/components/rules/types'\n\n// oxfmt-ignore\nexport const ${exportName}: RuleRecord[] = [\n${body}\n]\n`
}
