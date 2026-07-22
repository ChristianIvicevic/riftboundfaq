import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { parseCr, validateCoreRulesDataIndex } from '../scripts/parse-cr.mjs'
import {
	parseTournamentRules,
	parseTournamentRulesFile,
	validateTournamentRulesDataIndex,
} from '../scripts/parse-tr.mjs'
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
\t{"id": "100", "lines": ["Quoted \\"text\\"."]},
]
`,
	)
})

test('Tournament Rules registry entries must use their matching datasets', () => {
	const index = `import { TOURNAMENT_RULES_2026_04_29 } from '@/components/tournament-rules/data/v2026-04-29'
import { TOURNAMENT_RULES_2026_07_16 } from '@/components/tournament-rules/data/v2026-07-16'

export const TOURNAMENT_RULES_VERSIONS = {
\t'2026-04-29': { version: '2026-04-29', rules: TOURNAMENT_RULES_2026_07_16 },
\t'2026-07-16': { version: '2026-07-16', rules: TOURNAMENT_RULES_2026_07_16 },
}
`

	assert.throws(
		() => validateTournamentRulesDataIndex(index, new Set(['2026-04-29', '2026-07-16'])),
		/entry 2026-04-29 uses TOURNAMENT_RULES_2026_07_16/u,
	)
})

test('Core Rules registry entries must match their source metadata and datasets', () => {
	const index = `import { RULES_1_3 } from '@/components/core-rules/data/v1-3'
import { RULES_1_4 } from '@/components/core-rules/data/v1-4'

export const CRD_VERSIONS = {
	'1.3': { version: '1.3', name: 'Unleashed', lastUpdated: '2026-03-30', rules: RULES_1_4 },
	'1.4': { version: '1.4', name: 'Vendetta', lastUpdated: '2026-06-18', rules: RULES_1_4 },
}
`
	const expectedVersions = new Map([
		['1.3', '2026-03-30'],
		['1.4', '2026-06-18'],
	])

	assert.throws(() => validateCoreRulesDataIndex(index, expectedVersions), /entry 1\.3 uses RULES_1_4/u)
})
