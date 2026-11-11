import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Result } from 'effect'
import { describe, expect, test } from 'vitest'
import { parseRulesManifest, RulesManifestError } from './manifest'

const VALID_MANIFEST = {
	coreRules: {
		current: '1.10',
		versions: {
			'1.10': { name: 'Tenth' },
			'1.2': { name: 'Second' },
		},
	},
	tournamentRules: {
		current: '2026-10-01',
		versions: {
			'2026-10-01': {},
			'2026-02-01': {},
		},
	},
}

type RulesManifestSource = Parameters<typeof parseRulesManifest>[0]
type InvalidManifestCase = {
	case: string
	value: RulesManifestSource
	expectedMessageParts: readonly string[]
}

function parseValidRulesManifest(value: RulesManifestSource) {
	return Result.getOrThrow(parseRulesManifest(value))
}

function expectManifestFailure(value: RulesManifestSource, expectedMessageParts: readonly string[] = []) {
	const result = parseRulesManifest(value)
	if (Result.isSuccess(result)) throw new Error('Expected manifest parsing to fail')

	expect(result.failure).toBeInstanceOf(RulesManifestError)
	expect(result.failure.message).toContain('Invalid rules manifest')
	for (const expectedMessagePart of expectedMessageParts) {
		expect(result.failure.message).toContain(expectedMessagePart)
	}
}

describe('parseRulesManifest', () => {
	test('returns rules document families in canonical version order', () => {
		const input = structuredClone(VALID_MANIFEST)
		input.coreRules.versions['1.10'].name = ' Tenth '

		expect(parseValidRulesManifest(input)).toStrictEqual({
			coreRules: {
				registeredVersions: [
					{ version: '1.2', name: 'Second' },
					{ version: '1.10', name: ' Tenth ' },
				],
				currentVersion: { version: '1.10', name: ' Tenth ' },
			},
			tournamentRules: {
				registeredVersions: [{ version: '2026-02-01' }, { version: '2026-10-01' }],
				currentVersion: { version: '2026-10-01' },
			},
		})
	})

	test('keeps the authoritative manifest and generated indexes consistent', async () => {
		const projectDirectory = join(import.meta.dirname, '..', '..')
		const [manifestSource, coreIndex, tournamentIndex] = await Promise.all([
			readFile(join(projectDirectory, 'sources', 'rules-manifest.json'), 'utf8'),
			readFile(join(projectDirectory, 'src', 'generated', 'core-rules', 'index.ts'), 'utf8'),
			readFile(join(projectDirectory, 'src', 'generated', 'tournament-rules', 'index.ts'), 'utf8'),
		])
		const manifest = parseValidRulesManifest(JSON.parse(manifestSource))

		expect({
			coreRules: {
				current: /export const CURRENT_PDF_CORE_RULES_VERSION = "([^"]+)"/u.exec(coreIndex)?.[1],
				registeredVersions: [...coreIndex.matchAll(/^[ \t]+"([^"]+)": PDF_CORE_RULES_[A-Z0-9_]+,$/gmu)].map(
					(match) => match[1],
				),
				names: [...coreIndex.matchAll(/^[ \t]+"([^"]+)": "([^"]*)",$/gmu)].map((match) => ({
					version: match[1],
					name: match[2],
				})),
			},
			tournamentRules: {
				current: /export const CURRENT_PDF_TOURNAMENT_RULES_VERSION = "([^"]+)"/u.exec(tournamentIndex)?.[1],
				registeredVersions: [
					...tournamentIndex.matchAll(/^[ \t]+"([^"]+)": PDF_TOURNAMENT_RULES_[A-Z0-9_]+,$/gmu),
				].map((match) => match[1]),
			},
		}).toStrictEqual({
			coreRules: {
				current: manifest.coreRules.currentVersion.version,
				registeredVersions: manifest.coreRules.registeredVersions.map(({ version }) => version),
				names: manifest.coreRules.registeredVersions.flatMap(({ version, name }) =>
					name === undefined ? [] : [{ version, name }],
				),
			},
			tournamentRules: {
				current: manifest.tournamentRules.currentVersion.version,
				registeredVersions: manifest.tournamentRules.registeredVersions.map(({ version }) => version),
			},
		})
	})

	test.each<InvalidManifestCase>([
		{
			case: 'a non-object root',
			value: null,
			expectedMessageParts: [],
		},
		{
			case: 'an unknown root property',
			value: { ...VALID_MANIFEST, extra: true },
			expectedMessageParts: ['extra'],
		},
		{
			case: 'a missing rules document family',
			value: { coreRules: VALID_MANIFEST.coreRules },
			expectedMessageParts: ['tournamentRules'],
		},
		{
			case: 'an unknown family property',
			value: {
				...VALID_MANIFEST,
				coreRules: { ...VALID_MANIFEST.coreRules, latest: '1.10' },
			},
			expectedMessageParts: ['coreRules', 'latest'],
		},
		{
			case: 'a missing current rules version',
			value: {
				...VALID_MANIFEST,
				coreRules: { versions: VALID_MANIFEST.coreRules.versions },
			},
			expectedMessageParts: ['coreRules', 'current'],
		},
		{
			case: 'a versions array',
			value: {
				...VALID_MANIFEST,
				coreRules: { current: '1.10', versions: [] },
			},
			expectedMessageParts: ['coreRules', 'versions'],
		},
		{
			case: 'non-object Core Rules metadata',
			value: {
				...VALID_MANIFEST,
				coreRules: {
					...VALID_MANIFEST.coreRules,
					versions: { ...VALID_MANIFEST.coreRules.versions, '1.2': null },
				},
			},
			expectedMessageParts: ['coreRules', '1.2'],
		},
		{
			case: 'an unknown Core Rules metadata property',
			value: {
				...VALID_MANIFEST,
				coreRules: {
					...VALID_MANIFEST.coreRules,
					versions: { ...VALID_MANIFEST.coreRules.versions, '1.2': { title: 'Second' } },
				},
			},
			expectedMessageParts: ['coreRules', '1.2', 'title'],
		},
		{
			case: 'a whitespace-only Core Rules name',
			value: {
				...VALID_MANIFEST,
				coreRules: {
					...VALID_MANIFEST.coreRules,
					versions: { ...VALID_MANIFEST.coreRules.versions, '1.2': { name: '  ' } },
				},
			},
			expectedMessageParts: ['coreRules', '1.2', 'name'],
		},
		{
			case: 'Tournament Rules metadata',
			value: {
				...VALID_MANIFEST,
				tournamentRules: {
					...VALID_MANIFEST.tournamentRules,
					versions: {
						...VALID_MANIFEST.tournamentRules.versions,
						'2026-02-01': { name: 'February' },
					},
				},
			},
			expectedMessageParts: ['tournamentRules', '2026-02-01'],
		},
	])('rejects $case', ({ value, expectedMessageParts }) => {
		expectManifestFailure(value, expectedMessageParts)
	})

	test.each<InvalidManifestCase>([
		{
			case: 'an empty Core Rules history',
			value: {
				...VALID_MANIFEST,
				coreRules: { current: '1.10', versions: {} },
			},
			expectedMessageParts: ['coreRules', 'at least one registered version'],
		},
		{
			case: 'an empty Tournament Rules history',
			value: {
				...VALID_MANIFEST,
				tournamentRules: { current: '2026-10-01', versions: {} },
			},
			expectedMessageParts: ['tournamentRules', 'at least one registered version'],
		},
		{
			case: 'a non-canonical Core Rules version',
			value: {
				...VALID_MANIFEST,
				coreRules: { current: '1.02', versions: { '1.02': {} } },
			},
			expectedMessageParts: ['1.02', 'invalid Core Rules version'],
		},
		{
			case: 'an impossible Tournament Rules date',
			value: {
				...VALID_MANIFEST,
				tournamentRules: { current: '2026-02-30', versions: { '2026-02-30': {} } },
			},
			expectedMessageParts: ['2026-02-30', 'invalid Tournament Rules version'],
		},
		{
			case: 'an unregistered current Core Rules version',
			value: {
				...VALID_MANIFEST,
				coreRules: { ...VALID_MANIFEST.coreRules, current: '1.3' },
			},
			expectedMessageParts: ['coreRules', 'current version "1.3" is not registered'],
		},
		{
			case: 'an unregistered current Tournament Rules version',
			value: {
				...VALID_MANIFEST,
				tournamentRules: { ...VALID_MANIFEST.tournamentRules, current: '2026-03-01' },
			},
			expectedMessageParts: ['tournamentRules', 'current version "2026-03-01" is not registered'],
		},
		{
			case: 'a current Core Rules version below the greatest version',
			value: {
				...VALID_MANIFEST,
				coreRules: { ...VALID_MANIFEST.coreRules, current: '1.2' },
			},
			expectedMessageParts: ['coreRules', 'must be the greatest registered version "1.10"'],
		},
		{
			case: 'a current Tournament Rules version below the greatest version',
			value: {
				...VALID_MANIFEST,
				tournamentRules: { ...VALID_MANIFEST.tournamentRules, current: '2026-02-01' },
			},
			expectedMessageParts: ['tournamentRules', 'must be the greatest registered version "2026-10-01"'],
		},
	])('rejects $case', ({ value, expectedMessageParts }) => {
		expectManifestFailure(value, expectedMessageParts)
	})
})
