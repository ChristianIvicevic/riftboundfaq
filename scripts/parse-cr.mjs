// Parses a raw Core Rules text export (sources/CR-vX.Y.txt) into the structured
// RuleRecord[] shape used by src/components/core-rules/data. Dependency-free; run with node.
//
//   node scripts/parse-cr.mjs <raw.txt> <ExportName> [out]  emit a data file (stdout or file)
//
// The parser reproduces the normalization already baked into the existing data.ts:
//   - rejoin wrapped lines with a single space
//   - split a rule's body into separate `lines[]` entries on `Example:` / `See rule ` markers
//   - strip a leading `* ` bullet
//   - normalize curly quotes/apostrophes to ASCII (keep — … and U+200B)

import { readFileSync, writeFileSync } from 'node:fs'

const RULE_START = /^(\d{3}(?:\.[0-9a-z]+)*)\.(?:\s+(.*))?$/u
const ELEMENT_MARKER = /^(?:Example:|See rule )/u

/** Normalize typographic punctuation to ASCII and collapse ASCII-space runs. */
function normalize(text) {
	return (
		text
			// “ ” -> "
			.replaceAll(/[“”]/gu, '"')
			// ‘ ’ -> '
			.replaceAll(/[‘’]/gu, "'")
			.replaceAll(/[ \t]{2,}/gu, ' ')
			.trim()
	)
}

/** @returns {{ lastUpdated: string, rules: {id:string, lines:string[]}[] }} */
export function parseCr(text) {
	const rawLines = text.split('\n').map((l) => l.replace(/\r$/u, ''))

	// Header: line 0 = "Riftbound Core Rules", line 1 = "Last Updated: YYYY-MM-DD".
	const dateMatch = rawLines[1]?.match(/Last Updated:\s*(.+)$/u)
	const lastUpdated = dateMatch ? dateMatch[1].trim() : ''

	const rules = []
	let current = null

	const startElement = (raw) => {
		// Strip a leading `* ` bullet when opening an element.
		current.lines.push(raw.replace(/^\*\s+/u, ''))
	}

	for (let i = 2; i < rawLines.length; i++) {
		const line = rawLines[i]
		if (line.trim() === '') continue

		const ruleMatch = line.match(RULE_START)
		if (ruleMatch) {
			if (current) rules.push(current)
			const id = ruleMatch[1]
			const rest = ruleMatch[2] ?? ''
			current = { id, lines: [] }
			startElement(rest)
			continue
		}

		// Pre-first-rule stray lines (shouldn't happen).
		if (!current) continue

		if (ELEMENT_MARKER.test(line)) {
			startElement(line)
		} else {
			// Continuation of the current element: rejoin wrapped line with a space.
			current.lines[current.lines.length - 1] += ' ' + line
		}
	}
	if (current) rules.push(current)

	// Normalize every accumulated element.
	for (const rule of rules) rule.lines = rule.lines.map(normalize)
	return { lastUpdated, rules }
}

/**
 * Serialize rules in the exact one-rule-per-line, tab-indented style of data.ts.
 * `header` defaults to importing the shared RuleRecord type; pass 'inline'
 * to instead declare the type in-file (matches the original standalone data.ts).
 */
export function serialize(rules, exportName, header = 'import') {
	const preamble =
		header === 'inline'
			? 'export type RuleRecord = { id: string; lines: string[] }\n\n'
			: "import type { RuleRecord } from '@/components/rules/types'\n\n"
	const body = rules
		.map((r) => {
			const lines = r.lines.map((l) => JSON.stringify(l)).join(', ')
			return `\t{"id": ${JSON.stringify(r.id)}, "lines": [${lines}]},`
		})
		.join('\n')
	return `${preamble}// oxfmt-ignore\nexport const ${exportName}: RuleRecord[] = [\n${body}\n]\n`
}

function main() {
	const [rawPath, exportName, outPath] = process.argv.slice(2)
	if (!rawPath || !exportName) {
		console.error('usage: node scripts/parse-cr.mjs <raw.txt> <ExportName> [out]')
		process.exit(2)
	}
	const { rules, lastUpdated } = parseCr(readFileSync(rawPath, 'utf8'))
	const out = serialize(rules, exportName)
	console.error(`parsed ${rules.length} rules (Last Updated: ${lastUpdated})`)
	if (outPath) {
		writeFileSync(outPath, out)
		console.error(`wrote ${outPath}`)
	} else {
		process.stdout.write(out)
	}
}

if (process.argv[1] === import.meta.filename) main()
