import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, onTestFinished, test } from 'vitest'
import { prepareRulesMetadata, publishRulesMetadata } from './rules-metadata.ts'

const MANIFEST = {
	coreRules: { current: '1.4', versions: { '1.3': {}, '1.4': { name: 'Spiritforged' } } },
	tournamentRules: {
		current: '2026-07-16',
		versions: { '2026-04-29': {}, '2026-07-16': {} },
	},
}

describe('prepareRulesMetadata', () => {
	test('emits deterministic constants from registered current versions', () => {
		expect(prepareRulesMetadata(MANIFEST)).toStrictEqual({
			contents:
				'// Generated from sources/rules-manifest.json. Do not edit.\n\nexport const CURRENT_CORE_RULES_VERSION = "1.4"\nexport const CURRENT_TOURNAMENT_RULES_VERSION = "2026-07-16"\n',
			summary: { coreRulesVersion: '1.4', tournamentRulesVersion: '2026-07-16' },
		})
	})

	test.each([
		{ case: 'a non-object manifest', manifest: null, message: 'expected a manifest object' },
		{ case: 'missing Core Rules metadata', manifest: {}, message: 'expected coreRules metadata' },
		{
			case: 'a missing current Core Rules version',
			manifest: { coreRules: {} },
			message: 'expected coreRules.current',
		},
		{
			case: 'missing Core Rules versions',
			manifest: { coreRules: { current: '1.4' } },
			message: 'expected coreRules.versions',
		},
		{
			case: 'non-object Core Rules versions',
			manifest: { coreRules: { current: 'map', versions: [] } },
			message: 'expected coreRules.versions',
		},
		{
			case: 'an undefined current Core Rules version',
			manifest: { coreRules: { current: '1.4', versions: { '1.3': {} } } },
			message: 'current Core Rules version 1.4 is not defined',
		},
		{
			case: 'an undefined current Tournament Rules version',
			manifest: { coreRules: MANIFEST.coreRules, tournamentRules: { current: '2026-07-16', versions: {} } },
			message: 'current Tournament Rules version 2026-07-16 is not defined',
		},
	])('rejects $case', ({ manifest, message }) => {
		expect(() => prepareRulesMetadata(manifest)).toThrow(message)
	})
})

describe('publishRulesMetadata', () => {
	test('creates its destination and writes the prepared fixture unchanged', async () => {
		const temporaryDirectory = await mkdtemp(join(tmpdir(), 'riftbound-metadata-'))
		onTestFinished(() =>
			import('node:fs/promises').then(({ rm }) => rm(temporaryDirectory, { recursive: true })),
		)
		const outputPath = join(temporaryDirectory, 'nested', 'rules-metadata.ts')
		const prepared = prepareRulesMetadata(MANIFEST)

		await publishRulesMetadata(prepared, { outputPath })

		expect(await readFile(outputPath, 'utf8')).toBe(prepared.contents)
	})
})
