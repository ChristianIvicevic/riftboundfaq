// Parses a raw Core Rules text export (sources/CR-vX.Y.txt) into the structured
// RuleRecord[] shape used by src/components/core-rules/data. Dependency-free; run with node.
//
//   node scripts/parse-cr.mjs --check
//   node scripts/parse-cr.mjs <raw.txt> <ExportName> [out]  emit a data file (stdout or file)
//
// The parser reproduces the normalization already baked into the existing data.ts:
//   - rejoin wrapped lines with a single space
//   - split a rule's body into separate `lines[]` entries on `Example:` / `See rule ` markers
//   - strip a leading `* ` bullet
//   - normalize curly quotes/apostrophes to ASCII (keep — … and U+200B)

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { serializeRuleRecords } from './rules-parser-utils.mjs'

const RULE_START = /^(\d{3}(?:\.[0-9a-z]+)*)\.(?:\s+(.*))?$/u
const ELEMENT_MARKER = /^(?:Example:|See rule )/u
const SOURCE_FILENAME = /^CR-v(\d+\.\d+)\.txt$/u
const DATA_FILENAME = /^v\d+-\d+\.ts$/u
const REGISTRY_IMPORT =
	/^import \{ (RULES_\d+_\d+) \} from '@\/components\/core-rules\/data\/v(\d+)-(\d+)'$/gmu
const REGISTRY_ENTRY =
	/^\s*'(\d+\.\d+)': \{ version: '(\d+\.\d+)', name: '[^']+', lastUpdated: '([^']+)', rules: (RULES_\d+_\d+) \},$/gmu
const SOURCES_DIRECTORY = new URL('../sources/', import.meta.url)
const DATA_DIRECTORY = new URL('../src/components/core-rules/data/', import.meta.url)
const DATA_INDEX = new URL('index.ts', DATA_DIRECTORY)

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

function checkRegistryVersions(label, versions, expectedVersions) {
	const duplicates = versions.filter((version, index) => versions.indexOf(version) !== index)
	if (duplicates.length > 0) throw new Error(`data/index.ts: duplicate ${label} for ${duplicates[0]}`)

	const actualVersions = new Set(versions)
	for (const version of expectedVersions.keys()) {
		if (!actualVersions.has(version)) throw new Error(`data/index.ts: missing ${label} for ${version}`)
	}
	for (const version of actualVersions) {
		if (!expectedVersions.has(version))
			throw new Error(`data/index.ts: ${label} ${version} has no matching source`)
	}
}

const dataExportName = (version) => `RULES_${version.replace('.', '_')}`
const dataFilename = (version) => `v${version.replace('.', '-')}.ts`

export function validateCoreRulesDataIndex(index, expectedVersions) {
	const imports = [...index.matchAll(REGISTRY_IMPORT)].map((match) => ({
		name: match[1],
		version: `${match[2]}.${match[3]}`,
	}))
	for (const imported of imports) {
		if (imported.name !== dataExportName(imported.version)) {
			throw new Error(`data/index.ts: import ${imported.name} does not match version ${imported.version}`)
		}
	}

	const entries = [...index.matchAll(REGISTRY_ENTRY)].map((match) => ({
		key: match[1],
		version: match[2],
		lastUpdated: match[3],
		name: match[4],
	}))
	checkRegistryVersions(
		'import',
		imports.map((entry) => entry.version),
		expectedVersions,
	)
	checkRegistryVersions(
		'registry entry',
		entries.map((entry) => entry.key),
		expectedVersions,
	)

	for (const entry of entries) {
		if (entry.version !== entry.key) {
			throw new Error(`data/index.ts: entry ${entry.key} declares version ${entry.version}`)
		}
		if (entry.name !== dataExportName(entry.key)) {
			throw new Error(`data/index.ts: entry ${entry.key} uses ${entry.name}`)
		}
		if (entry.lastUpdated !== expectedVersions.get(entry.key)) {
			throw new Error(
				`data/index.ts: entry ${entry.key} has Last Updated ${entry.lastUpdated}; expected ${expectedVersions.get(entry.key)}`,
			)
		}
	}
}

function checkAllSources() {
	const filenames = readdirSync(SOURCES_DIRECTORY)
		.filter((filename) => filename.startsWith('CR-v') && filename.endsWith('.txt'))
		.toSorted()

	if (filenames.length === 0) throw new Error('no Core Rules sources found')

	const expectedDataFilenames = new Set()
	const expectedVersions = new Map()
	for (const filename of filenames) {
		const filenameMatch = filename.match(SOURCE_FILENAME)
		if (!filenameMatch) throw new Error(`${filename}: expected CR-vX.Y.txt`)

		const version = filenameMatch[1]
		const { lastUpdated, rules } = parseCr(readFileSync(new URL(filename, SOURCES_DIRECTORY), 'utf8'))
		const generatedFilename = dataFilename(version)
		const dataUrl = new URL(generatedFilename, DATA_DIRECTORY)
		expectedDataFilenames.add(generatedFilename)
		expectedVersions.set(version, lastUpdated)
		if (!existsSync(dataUrl)) throw new Error(`${filename}: generated data file is missing`)
		if (readFileSync(dataUrl, 'utf8') !== serializeRuleRecords(rules, dataExportName(version))) {
			throw new Error(`${filename}: generated data is stale; regenerate ${generatedFilename}`)
		}
		console.log(`${version}: ${rules.length} rules`)
	}

	for (const generatedFilename of readdirSync(DATA_DIRECTORY).filter((filename) =>
		DATA_FILENAME.test(filename),
	)) {
		if (!expectedDataFilenames.has(generatedFilename)) {
			throw new Error(`${generatedFilename}: generated data has no matching source`)
		}
	}

	validateCoreRulesDataIndex(readFileSync(DATA_INDEX, 'utf8'), expectedVersions)
}

function main() {
	const cliArguments = process.argv.slice(2)
	const [rawPath, exportName, outPath] = cliArguments
	if (rawPath === '--check') {
		if (cliArguments.length !== 1) throw new Error('--check does not accept additional arguments')
		checkAllSources()
		return
	}

	if (!rawPath || !exportName) {
		console.error('usage: node scripts/parse-cr.mjs --check')
		console.error('   or: node scripts/parse-cr.mjs <raw.txt> <ExportName> [out]')
		process.exit(2)
	}
	const { rules, lastUpdated } = parseCr(readFileSync(rawPath, 'utf8'))
	const out = serializeRuleRecords(rules, exportName)
	console.error(`parsed ${rules.length} rules (Last Updated: ${lastUpdated})`)
	if (outPath) {
		writeFileSync(outPath, out)
		console.error(`wrote ${outPath}`)
	} else {
		process.stdout.write(out)
	}
}

if (process.argv[1] === import.meta.filename) main()
