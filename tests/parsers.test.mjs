import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { generateRules } from '../scripts/generate-rules.mjs'
import { parseCr } from '../scripts/parse-cr.mjs'
import { parseTournamentRules, parseTournamentRulesFile } from '../scripts/parse-tr.mjs'
import { serializeRuleRecords } from '../scripts/rules-parser-utils.mjs'

const TOURNAMENT_RULES_HEADER = 'Riftbound Tournament Rules\nLast Updated: 2026-07-16\n'

test('Core Rules parsing preserves its historical normalization', () => {
	const parsed = parseCr(`Riftbound Core Rules
Last Updated: 2026-06-18
100. * “Quoted”  text
wrapped line
Example: It’s separate.
`)

	assert.equal(parsed.lastUpdated, '2026-06-18')
	assert.deepEqual(parsed.rules, [
		{ id: '100', lines: ['"Quoted" text wrapped line', "Example: It's separate."] },
	])
})

test('Tournament Rules parsing validates and normalizes rule records', () => {
	const parsed = parseTournamentRules(`${TOURNAMENT_RULES_HEADER}100. First  rule.
wrapped line
100.1. Child rule.
`)

	assert.equal(parsed.lastUpdated, '2026-07-16')
	assert.deepEqual(parsed.rules, [
		{ id: '100', lines: ['First rule. wrapped line'] },
		{ id: '100.1', lines: ['Child rule.'] },
	])
})

test('Tournament Rules parsing rejects an empty document', () => {
	assert.throws(() => parseTournamentRules(TOURNAMENT_RULES_HEADER), /document contains no rules/u)
})

test('Tournament Rules parsing rejects malformed, duplicate, and backwards labels', () => {
	assert.throws(
		() => parseTournamentRules(`${TOURNAMENT_RULES_HEADER}100.A. Invalid label.\n`),
		/resembles rule 100\.A but has an invalid label/u,
	)
	assert.throws(
		() => parseTournamentRules(`${TOURNAMENT_RULES_HEADER}100. First.\n100. Duplicate.\n`),
		/duplicate rule 100/u,
	)
	assert.throws(
		() => parseTournamentRules(`${TOURNAMENT_RULES_HEADER}101. First.\n100. Backwards.\n`),
		/rule 100 .* follows 101/u,
	)
})

test('Tournament Rules filenames must match the Last Updated date', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'riftboundfaq-tr-'))
	const sourcePath = join(directory, 'Tournament-Rules-2026-07-17.txt')
	try {
		await writeFile(sourcePath, `${TOURNAMENT_RULES_HEADER}100. Rule text.\n`)
		assert.throws(() => parseTournamentRulesFile(sourcePath), /filename date does not match Last Updated/u)
	} finally {
		await rm(directory, { recursive: true })
	}
})

test('Rule records serialize in the generated data format', () => {
	assert.equal(
		serializeRuleRecords([{ id: '100', lines: ['Quoted "text".'] }], 'RULES_TEST'),
		`import type { RuleRecord } from '@/components/rules/types'

// oxfmt-ignore
export const RULES_TEST: RuleRecord[] = [
	{"id": "100", "lines": ["Quoted \\"text\\"."]},
]
`,
	)
})

test('Rules generation creates deterministic indexes and removes stale artifacts', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'riftboundfaq-rules-'))
	const sourcesDirectory = join(directory, 'sources')
	const outputDirectory = join(directory, 'generated')
	try {
		await mkdir(sourcesDirectory)
		await mkdir(outputDirectory)
		await writeFile(
			join(sourcesDirectory, 'rules-manifest.json'),
			JSON.stringify({
				coreRules: { current: '1.0', versions: { '1.0': { name: 'Test Set' } } },
				tournamentRules: { current: '2026-07-16' },
			}),
		)
		await writeFile(
			join(sourcesDirectory, 'CR-v1.0.txt'),
			'Riftbound Core Rules\nLast Updated: 2026-07-16\n100. Core rule.\n',
		)
		await writeFile(
			join(sourcesDirectory, 'Tournament-Rules-2026-07-16.txt'),
			`${TOURNAMENT_RULES_HEADER}100. Tournament rule.\n`,
		)
		await writeFile(join(outputDirectory, 'stale.ts'), 'stale')

		await generateRules({ sourcesDirectory, outputDirectory })
		const firstIndex = await readFile(join(outputDirectory, 'core-rules', 'index.ts'), 'utf8')
		assert.match(firstIndex, /CURRENT_CRD_VERSION = "1\.0"/u)
		assert.match(firstIndex, /name: "Test Set"/u)
		await assert.rejects(readFile(join(outputDirectory, 'stale.ts'), 'utf8'))

		await generateRules({ sourcesDirectory, outputDirectory })
		assert.equal(await readFile(join(outputDirectory, 'core-rules', 'index.ts'), 'utf8'), firstIndex)

		await writeFile(
			join(sourcesDirectory, 'rules-manifest.json'),
			JSON.stringify({
				coreRules: { current: '1.0', versions: {} },
				tournamentRules: { current: '2026-07-16' },
			}),
		)
		await assert.rejects(generateRules({ sourcesDirectory, outputDirectory }), /missing Core Rules metadata/u)
		assert.equal(await readFile(join(outputDirectory, 'core-rules', 'index.ts'), 'utf8'), firstIndex)
	} finally {
		await rm(directory, { recursive: true })
	}
})
