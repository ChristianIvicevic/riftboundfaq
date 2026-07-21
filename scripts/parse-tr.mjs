// Parses Tournament Rules text exports into the RuleRecord[] shape used by the site.
// Dependency-free; run with node.
//
//   node scripts/parse-tr.mjs --check
//   node scripts/parse-tr.mjs <raw.txt> <ExportName> [out]
//
// Source normalization notes:
// - PDF extraction can wrap references onto lines that resemble rule records. Those lines are
//   rejoined in the source files, and backwards rule IDs are rejected to catch regressions.
// - Struck-through text retained by extraction is omitted: March's first 703.4.a.1 example and
//   July's 601.3.c.4.b release date.
// - March label defects are normalized: 509.4.c.1.1 becomes 509.4.c.1, and final periods are
//   restored on 602.1.a.1 and 602.1.a.2.
// - The unnumbered blank-battlefields item in all three extractions is restored as 602.1.a.3.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const TITLE = 'Riftbound Tournament Rules'
const RULE_START = /^(\d{3}(?:\.[0-9a-z]+)*)\.(?:\s+(.*))?$/u
const MALFORMED_RULE_START = /^(\d{3}(?:\.[0-9A-Za-z]+)*)(?:\.)?\s+\S/u
const SOURCE_FILENAME = /^Tournament-Rules-(\d{4}-\d{2}-\d{2})\.txt$/u
const DATA_FILENAME = /^v\d{4}-\d{2}-\d{2}\.ts$/u
const SOURCES_DIRECTORY = new URL('../sources/', import.meta.url)
const DATA_DIRECTORY = new URL('../src/components/tournament-rules/data/', import.meta.url)

function normalize(text) {
	return text.replaceAll(/[ \t]{2,}/gu, ' ').trim()
}

function normalizeDate(rawDate) {
	const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/u)
	const usMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u)
	const parts = isoMatch
		? { year: Number(isoMatch[1]), month: Number(isoMatch[2]), day: Number(isoMatch[3]) }
		: usMatch
			? { year: Number(usMatch[3]), month: Number(usMatch[1]), day: Number(usMatch[2]) }
			: null

	if (!parts) throw new Error(`unsupported Last Updated date: ${rawDate}`)

	const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
	if (
		date.getUTCFullYear() !== parts.year ||
		date.getUTCMonth() !== parts.month - 1 ||
		date.getUTCDate() !== parts.day
	) {
		throw new Error(`invalid Last Updated date: ${rawDate}`)
	}

	return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

function compareRuleIds(left, right) {
	const leftParts = left.split('.')
	const rightParts = right.split('.')
	const length = Math.min(leftParts.length, rightParts.length)

	for (let index = 0; index < length; index++) {
		const leftPart = leftParts[index]
		const rightPart = rightParts[index]
		const leftNumber = /^\d+$/u.test(leftPart) ? Number(leftPart) : null
		const rightNumber = /^\d+$/u.test(rightPart) ? Number(rightPart) : null
		const comparison =
			leftNumber !== null && rightNumber !== null
				? leftNumber - rightNumber
				: leftPart.localeCompare(rightPart, 'en')

		if (comparison !== 0) return comparison
	}

	return leftParts.length - rightParts.length
}

/** @returns {{ lastUpdated: string, rules: { id: string, lines: string[] }[] }} */
export function parseTournamentRules(text) {
	if (text.includes('\f')) throw new Error('source contains form-feed characters')

	const rawLines = text.split('\n').map((line) => line.replace(/\r$/u, ''))
	if (rawLines[0] !== TITLE) throw new Error(`expected document title "${TITLE}"`)

	const dateMatch = rawLines[1]?.match(/^Last Updated(?::\s*|\s+)(.+)$/u)
	if (!dateMatch) throw new Error('expected a Last Updated header on line 2')
	const lastUpdated = normalizeDate(dateMatch[1].trim())

	const rules = []
	const seenIds = new Map()
	let current = null

	for (let index = 2; index < rawLines.length; index++) {
		const line = rawLines[index]
		if (line.trim() === '') continue

		const ruleMatch = line.match(RULE_START)
		if (!ruleMatch) {
			const malformedMatch = line.match(MALFORMED_RULE_START)
			if (malformedMatch) {
				throw new Error(`line ${index + 1} resembles rule ${malformedMatch[1]} but has an invalid label`)
			}

			if (!current) throw new Error(`unexpected content before the first rule on line ${index + 1}`)
			current.lines[0] += ` ${line}`
			continue
		}

		const id = ruleMatch[1]
		const body = ruleMatch[2]?.trim()
		if (!body) throw new Error(`rule ${id} has no text on line ${index + 1}`)

		const firstLine = seenIds.get(id)
		if (firstLine) throw new Error(`duplicate rule ${id} on lines ${firstLine} and ${index + 1}`)

		if (current && compareRuleIds(id, current.id) < 0) {
			throw new Error(
				`rule ${id} on line ${index + 1} follows ${current.id}; check for an extraction-wrapped reference`,
			)
		}

		if (current) rules.push(current)
		current = { id, lines: [body] }
		seenIds.set(id, index + 1)
	}

	if (current) rules.push(current)
	for (const rule of rules) rule.lines = rule.lines.map(normalize)

	return { lastUpdated, rules }
}

export function parseTournamentRulesFile(sourcePath) {
	const filename = basename(sourcePath instanceof URL ? fileURLToPath(sourcePath) : sourcePath)
	const filenameMatch = filename.match(SOURCE_FILENAME)
	if (!filenameMatch) throw new Error(`${filename}: expected Tournament-Rules-YYYY-MM-DD.txt`)

	const parsed = parseTournamentRules(readFileSync(sourcePath, 'utf8'))
	if (filenameMatch[1] !== parsed.lastUpdated) {
		throw new Error(`${filename}: filename date does not match Last Updated ${parsed.lastUpdated}`)
	}

	return parsed
}

export function serialize(rules, exportName) {
	const body = rules
		.map((rule) => {
			const lines = rule.lines.map((line) => JSON.stringify(line)).join(', ')
			return `\t{"id": ${JSON.stringify(rule.id)}, "lines": [${lines}]},`
		})
		.join('\n')

	return `import type { RuleRecord } from '@/components/rules/types'\n\n// oxfmt-ignore\nexport const ${exportName}: RuleRecord[] = [\n${body}\n]\n`
}

function checkAllSources() {
	const filenames = readdirSync(SOURCES_DIRECTORY)
		.filter((filename) => filename.startsWith('Tournament-Rules-') && filename.endsWith('.txt'))
		.toSorted()

	if (filenames.length === 0) throw new Error('no Tournament Rules sources found')

	const expectedDataFilenames = new Set()
	for (const filename of filenames) {
		const { lastUpdated, rules } = parseTournamentRulesFile(new URL(filename, SOURCES_DIRECTORY))
		const exportName = `TOURNAMENT_RULES_${lastUpdated.replaceAll('-', '_')}`
		const dataFilename = `v${lastUpdated}.ts`
		const dataUrl = new URL(dataFilename, DATA_DIRECTORY)
		expectedDataFilenames.add(dataFilename)
		if (!existsSync(dataUrl)) throw new Error(`${filename}: generated data file is missing`)
		if (readFileSync(dataUrl, 'utf8') !== serialize(rules, exportName)) {
			throw new Error(`${filename}: generated data is stale; regenerate v${lastUpdated}.ts`)
		}
		console.log(`${lastUpdated}: ${rules.length} rules`)
	}

	for (const dataFilename of readdirSync(DATA_DIRECTORY).filter((filename) => DATA_FILENAME.test(filename))) {
		if (!expectedDataFilenames.has(dataFilename)) {
			throw new Error(`${dataFilename}: generated data has no matching source`)
		}
	}
}

function main() {
	const cliArguments = process.argv.slice(2)
	const [firstArgument, exportName, outputPath] = cliArguments
	if (firstArgument === '--check') {
		if (cliArguments.length !== 1) throw new Error('--check does not accept additional arguments')
		checkAllSources()
		return
	}

	if (!firstArgument || !exportName) {
		console.error('usage: node scripts/parse-tr.mjs --check')
		console.error('   or: node scripts/parse-tr.mjs <raw.txt> <ExportName> [out]')
		process.exit(2)
	}

	const { lastUpdated, rules } = parseTournamentRulesFile(firstArgument)
	const output = serialize(rules, exportName)
	console.error(`parsed ${rules.length} rules (Last Updated: ${lastUpdated})`)

	if (outputPath) {
		writeFileSync(outputPath, output)
		console.error(`wrote ${outputPath}`)
	} else {
		process.stdout.write(output)
	}
}

if (process.argv[1] === import.meta.filename) main()
