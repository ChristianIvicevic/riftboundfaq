import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, onTestFinished, test } from 'vitest'
import { publishRules, type PreparedPublication, type RulesAdapter } from '../rules-publication.ts'
import { prepareReferencePages, publishReferencePages, type ReferencePreparationInputs } from './generate.ts'

const MANIFEST = {
	coreRules: {
		current: '1.2',
		versions: {
			'1.0': {},
			1.1: { name: 'Origins' },
			1.2: { name: 'Spiritforged' },
		},
	},
	tournamentRules: {
		current: '2026-04-29',
		versions: {
			'2025-07-21': {},
			'2026-03-30': {},
			'2026-04-29': {},
		},
	},
}

const PREPARED_CORE_RULES = {
	referenceVersions: [
		{ version: '1.0', lastUpdated: '2025-06-02' },
		{ version: '1.1', name: 'Origins', lastUpdated: '2025-10-01' },
		{ version: '1.2', name: 'Spiritforged', lastUpdated: '2025-12-01' },
	],
	summary: { versions: 3 },
}

const PREPARED_TOURNAMENT_RULES = {
	referenceVersions: [
		{ version: '2025-07-21', lastUpdated: '2025-07-21' },
		{ version: '2026-03-30', lastUpdated: '2026-03-30' },
		{ version: '2026-04-29', lastUpdated: '2026-04-29' },
	],
	summary: { versions: 3 },
}

async function createTemplates(directory: string): Promise<void> {
	await mkdir(directory, { recursive: true })
	await Promise.all([
		writeFile(
			join(directory, 'index.mdx'),
			'core changes:\n{{CORE_RULES_CHANGES}}\ncore archive:\n{{CORE_RULES_ARCHIVE}}\ntournament changes:\n{{TOURNAMENT_RULES_CHANGES}}\ntournament archive:\n{{TOURNAMENT_RULES_ARCHIVE}}\n',
		),
		writeFile(join(directory, 'meta.json.template'), '{\n\t"pages": [\n{{PAGES}}\n\t]\n}\n'),
		writeFile(join(directory, 'core-rules-current.mdx'), 'current core {{METADATA_TITLE}}|{{CREATED_AT}}'),
		writeFile(
			join(directory, 'core-rules-archive.mdx'),
			'{{TITLE}}|{{METADATA_TITLE}}|{{DESCRIPTION}}|{{VERSION}}|{{CREATED_AT}}',
		),
		writeFile(
			join(directory, 'core-rules-change.mdx'),
			'{{TITLE}}|{{METADATA_TITLE}}|{{DESCRIPTION}}|{{FROM}}|{{TO}}|{{CREATED_AT}}',
		),
		writeFile(
			join(directory, 'tournament-rules-current.mdx'),
			'current tournament {{METADATA_TITLE}}|{{CREATED_AT}}',
		),
		writeFile(
			join(directory, 'tournament-rules-archive.mdx'),
			'{{TITLE}}|{{METADATA_TITLE}}|{{DESCRIPTION}}|{{VERSION}}|{{CREATED_AT}}',
		),
		writeFile(
			join(directory, 'tournament-rules-change.mdx'),
			'{{TITLE}}|{{METADATA_TITLE}}|{{DESCRIPTION}}|{{FROM}}|{{TO}}|{{CREATED_AT}}',
		),
	])
}

async function createReferenceWorkspace() {
	const temporaryDirectory = await mkdtemp(join(tmpdir(), 'riftbound-reference-'))
	onTestFinished(() =>
		import('node:fs/promises').then(({ rm }) => rm(temporaryDirectory, { recursive: true })),
	)
	const templatesDirectory = join(temporaryDirectory, 'templates')
	await createTemplates(templatesDirectory)
	return {
		templatesDirectory,
		outputDirectory: join(temporaryDirectory, 'reference'),
	}
}

const inertAdapter = <Prepared extends PreparedPublication>(prepared: Prepared): RulesAdapter<Prepared> => ({
	async prepare() {
		return prepared
	},
	async publish() {},
})

describe('reference publication integration', () => {
	test('publishes the complete reference site', async () => {
		const { templatesDirectory, outputDirectory } = await createReferenceWorkspace()

		await publishRules({
			manifest: MANIFEST,
			metadataAdapter: inertAdapter({ summary: {} }),
			coreRulesAdapter: inertAdapter(PREPARED_CORE_RULES),
			tournamentRulesAdapter: inertAdapter(PREPARED_TOURNAMENT_RULES),
			referenceAdapter: {
				prepare: (manifest: unknown, inputs: ReferencePreparationInputs) =>
					prepareReferencePages(manifest, { ...inputs, templatesDirectory }),
				publish: (prepared) => publishReferencePages(prepared, { outputDirectory }),
			},
		})

		expect(await readFile(join(outputDirectory, 'core-rules/index.mdx'), 'utf8')).toBe(
			'current core Core Rules 1.2 (Spiritforged)|2025-12-01',
		)
		expect(await readFile(join(outputDirectory, 'core-rules/1.0.mdx'), 'utf8')).toMatch(
			/^Core Rules 1\.0\|Core Rules 1\.0\|Archived snapshot.+version 1\.0\.\|1\.0\|2025-06-02$/u,
		)
		await expect(readFile(join(outputDirectory, 'core-rules/1.2.mdx'), 'utf8')).rejects.toMatchObject({
			code: 'ENOENT',
		})
		expect(await readFile(join(outputDirectory, 'core-rules/changes/1.1.mdx'), 'utf8')).toMatch(
			/Origins Changes\|Core Rules 1\.1 Changes \(Origins\)\|.+1\.0.+1\.1 \(Origins\)\.\|1\.0\|1\.1\|2025-10-01/u,
		)
		expect(await readFile(join(outputDirectory, 'tournament-rules/changes/2026-03-30.mdx'), 'utf8')).toMatch(
			/March 2026 Changes\|Tournament Rules Changes \(March 30, 2026\)\|.+July 2025.+March 2026.+\|2025-07-21\|2026-03-30\|2026-03-30/u,
		)
		const meta = JSON.parse(await readFile(join(outputDirectory, 'meta.json'), 'utf8'))
		expect(meta.pages).toStrictEqual([
			'index',
			'---Current Documents---',
			'core-rules/index',
			'tournament-rules/index',
			'---Core Rules Changes---',
			'core-rules/changes/1.2',
			'core-rules/changes/1.1',
			'---Tournament Rules Changes---',
			'tournament-rules/changes/2026-04-29',
			'tournament-rules/changes/2026-03-30',
			'---Archived Core Rules---',
			'core-rules/1.1',
			'core-rules/1.0',
			'---Archived Tournament Rules---',
			'tournament-rules/2026-03-30',
			'tournament-rules/2025-07-21',
		])
		expect(await readFile(join(outputDirectory, 'index.mdx'), 'utf8')).not.toMatch(/\{\{[A-Z_]+\}\}/u)
	})
})

describe('prepareReferencePages', () => {
	test('preserves archived Core Rules frontmatter and components from tracked templates', async () => {
		const { artifacts } = await prepareReferencePages(MANIFEST, {
			coreRules: PREPARED_CORE_RULES,
			tournamentRules: PREPARED_TOURNAMENT_RULES,
		})

		expect(artifacts.get('core-rules/1.0.mdx')).toMatch(
			/createdAt: "2025-06-02"[\s\S]+version: "1\.0"[\s\S]+noindex: true[\s\S]+<CoreRulesDocument \/>/u,
		)
	})

	test('preserves Core Rules diff components from tracked templates', async () => {
		const { artifacts } = await prepareReferencePages(MANIFEST, {
			coreRules: PREPARED_CORE_RULES,
			tournamentRules: PREPARED_TOURNAMENT_RULES,
		})

		expect(artifacts.get('core-rules/changes/1.1.mdx')).toMatch(
			/noindex: true[\s\S]+<CoreRulesDiff from="1\.0" to="1\.1" \/>/u,
		)
	})

	test('preserves Tournament Rules components from tracked templates', async () => {
		const { artifacts } = await prepareReferencePages(MANIFEST, {
			coreRules: PREPARED_CORE_RULES,
			tournamentRules: PREPARED_TOURNAMENT_RULES,
		})

		expect(artifacts.get('tournament-rules/changes/2026-04-29.mdx')).toMatch(
			/<TournamentRulesDiff[\s\S]+from="2026-03-30"[\s\S]+to="2026-04-29"[\s\S]+includeChangeDescriptions/u,
		)
	})

	test('preserves history prose from tracked templates', async () => {
		const { artifacts } = await prepareReferencePages(MANIFEST, {
			coreRules: PREPARED_CORE_RULES,
			tournamentRules: PREPARED_TOURNAMENT_RULES,
		})

		expect(artifacts.get('index.mdx')).toMatch(/Changes from March 30 to April 29, 2026\./u)
	})

	test('rejects a current version that is not the greatest registered version', async () => {
		const { templatesDirectory } = await createReferenceWorkspace()
		const manifest = structuredClone(MANIFEST)
		manifest.coreRules.current = '1.1'

		await expect(
			prepareReferencePages(manifest, {
				coreRules: { referenceVersions: [] },
				tournamentRules: { referenceVersions: [] },
				templatesDirectory,
			}),
		).rejects.toThrow(/current Core Rules version 1\.1 must be the greatest registered version 1\.2/u)
	})

	test('rejects an invalid parsed Last Updated date', async () => {
		const { templatesDirectory } = await createReferenceWorkspace()

		await expect(
			prepareReferencePages(MANIFEST, {
				coreRules: {
					referenceVersions: [
						{ version: '1.0', lastUpdated: '2025-06-02' },
						{ version: '1.1', lastUpdated: 'not a date' },
						{ version: '1.2', lastUpdated: '2025-12-01' },
					],
				},
				tournamentRules: { referenceVersions: [] },
				templatesDirectory,
			}),
		).rejects.toThrow(/Core Rules 1\.1 Last Updated "not a date" is not a recognized date/u)
	})
})
