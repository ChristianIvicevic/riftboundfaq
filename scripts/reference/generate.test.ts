import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, onTestFinished, test } from 'vitest'
import { parseRulesManifest, type RulesManifest } from '../rules-manifest.ts'
import { publishRules, type PreparedPublication, type RulesAdapter } from '../rules-publication.ts'
import { prepareReferencePages, publishReferencePages, type ReferencePreparationInputs } from './generate.ts'

const MANIFEST = parseRulesManifest({
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
})

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
			'core current: {{CORE_RULES_CURRENT_VERSION}}\ncore changes:\n{{CORE_RULES_CHANGES}}\ncore archive:\n{{CORE_RULES_ARCHIVE}}\ntournament current: {{TOURNAMENT_RULES_CURRENT_VERSION}}\ntournament changes:\n{{TOURNAMENT_RULES_CHANGES}}\ntournament archive:\n{{TOURNAMENT_RULES_ARCHIVE}}\n',
		),
		writeFile(join(directory, 'meta.json.template'), '{\n\t"pages": [\n{{PAGES}}\n\t]\n}\n'),
		writeFile(
			join(directory, 'group-meta.json.template'),
			'{\n\t"title": "{{TITLE}}",\n\t"defaultOpen": false,\n\t"collapsible": true,\n\t"pages": [\n{{PAGES}}\n\t]\n}\n',
		),
		writeFile(join(directory, 'core-rules-current.mdx'), 'current core {{TITLE}}|{{VERSION}}|{{CREATED_AT}}'),
		writeFile(
			join(directory, 'core-rules-archive.mdx'),
			'{{TITLE}}|{{SIDEBAR_TITLE}}|{{DESCRIPTION}}|{{VERSION}}|{{CREATED_AT}}|{{CURRENT_VERSION}}',
		),
		writeFile(
			join(directory, 'core-rules-change.mdx'),
			'{{TITLE}}|{{SIDEBAR_TITLE}}|{{DESCRIPTION}}|{{FROM}}|{{TO}}|{{CREATED_AT}}',
		),
		writeFile(
			join(directory, 'tournament-rules-current.mdx'),
			'current tournament {{TITLE}}|{{VERSION}}|{{CREATED_AT}}',
		),
		writeFile(
			join(directory, 'tournament-rules-archive.mdx'),
			'{{TITLE}}|{{SIDEBAR_TITLE}}|{{DESCRIPTION}}|{{VERSION}}|{{CREATED_AT}}|{{CURRENT_VERSION}}',
		),
		writeFile(
			join(directory, 'tournament-rules-change.mdx'),
			'{{TITLE}}|{{SIDEBAR_TITLE}}|{{DESCRIPTION}}|{{FROM}}|{{TO}}|{{CREATED_AT}}',
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

const inertAdapter = <Prepared extends PreparedPublication>(
	prepared: Prepared,
): RulesAdapter<unknown, Prepared> => ({
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
				prepare: (manifest: RulesManifest, inputs: ReferencePreparationInputs) =>
					prepareReferencePages(manifest, { ...inputs, templatesDirectory }),
				publish: (prepared) => publishReferencePages(prepared, { outputDirectory }),
			},
		})

		expect(await readFile(join(outputDirectory, 'core-rules/1.2.mdx'), 'utf8')).toBe(
			'current core Core Rules 1.2 (Spiritforged)|1.2|2025-12-01',
		)
		expect(await readFile(join(outputDirectory, 'core-rules/(archive)/1.0.mdx'), 'utf8')).toMatch(
			/^Core Rules 1\.0\|Core Rules 1\.0\|Archived snapshot.+version 1\.0\.\|1\.0\|2025-06-02\|1\.2$/u,
		)
		await expect(readFile(join(outputDirectory, 'core-rules/index.mdx'), 'utf8')).rejects.toMatchObject({
			code: 'ENOENT',
		})
		expect(await readFile(join(outputDirectory, 'tournament-rules/2026-04-29.mdx'), 'utf8')).toBe(
			'current tournament Tournament Rules (April 29, 2026)|2026-04-29|2026-04-29',
		)
		await expect(readFile(join(outputDirectory, 'tournament-rules/index.mdx'), 'utf8')).rejects.toMatchObject(
			{ code: 'ENOENT' },
		)
		expect(await readFile(join(outputDirectory, 'core-rules/changes/1.1.mdx'), 'utf8')).toMatch(
			/Core Rules 1\.1 Changes \(Origins\)\|Origins Changes\|.+1\.0.+1\.1 \(Origins\)\.\|1\.0\|1\.1\|2025-10-01/u,
		)
		expect(await readFile(join(outputDirectory, 'tournament-rules/changes/2026-03-30.mdx'), 'utf8')).toMatch(
			/Tournament Rules Changes \(March 30, 2026\)\|March 2026 Changes\|.+July 2025.+March 2026.+\|2025-07-21\|2026-03-30\|2026-03-30/u,
		)
		const meta = JSON.parse(await readFile(join(outputDirectory, 'meta.json'), 'utf8'))
		expect(meta.pages).toStrictEqual([
			'---Introduction---',
			'index',
			'---Current Documents---',
			'core-rules/1.2',
			'tournament-rules/2026-04-29',
			'---Core Rules---',
			'core-rules/changes',
			'core-rules/(archive)',
			'---Tournament Rules---',
			'tournament-rules/changes',
			'tournament-rules/(archive)',
		])
		expect(
			JSON.parse(await readFile(join(outputDirectory, 'core-rules/changes/meta.json'), 'utf8')),
		).toStrictEqual({
			title: 'Changes',
			defaultOpen: false,
			collapsible: true,
			pages: ['1.2', '1.1'],
		})
		expect(
			JSON.parse(await readFile(join(outputDirectory, 'core-rules/(archive)/meta.json'), 'utf8')),
		).toStrictEqual({
			title: 'Archive',
			defaultOpen: false,
			collapsible: true,
			pages: ['1.1', '1.0'],
		})
		expect(
			JSON.parse(await readFile(join(outputDirectory, 'tournament-rules/changes/meta.json'), 'utf8')),
		).toStrictEqual({
			title: 'Changes',
			defaultOpen: false,
			collapsible: true,
			pages: ['2026-04-29', '2026-03-30'],
		})
		expect(
			JSON.parse(await readFile(join(outputDirectory, 'tournament-rules/(archive)/meta.json'), 'utf8')),
		).toStrictEqual({
			title: 'Archive',
			defaultOpen: false,
			collapsible: true,
			pages: ['2026-03-30', '2025-07-21'],
		})
		expect(await readFile(join(outputDirectory, 'index.mdx'), 'utf8')).not.toMatch(/\{\{[A-Z_]+\}\}/u)
	})
})

describe('prepareReferencePages', () => {
	test('preserves archived Core Rules frontmatter and components from tracked templates', async () => {
		const { artifacts, summary } = await prepareReferencePages(MANIFEST, {
			coreRules: PREPARED_CORE_RULES,
			tournamentRules: PREPARED_TOURNAMENT_RULES,
		})

		expect(artifacts.get('core-rules/(archive)/1.0.mdx')).toMatch(
			/createdAt: "2025-06-02"[\s\S]+version: "1\.0"[\s\S]+noindex: true[\s\S]+Archived reference[\s\S]+\/reference\/core-rules\/1\.2[\s\S]+<CoreRulesDocument \/>/u,
		)
		expect(summary.pages).toBe(11)
	})

	test('selects current documents by explicit version', async () => {
		const { artifacts } = await prepareReferencePages(MANIFEST, {
			coreRules: PREPARED_CORE_RULES,
			tournamentRules: PREPARED_TOURNAMENT_RULES,
		})

		expect(artifacts.get('core-rules/1.2.mdx')).toMatch(/version: "1\.2"/u)
		expect(artifacts.get('tournament-rules/2026-04-29.mdx')).toMatch(/version: "2026-04-29"/u)
	})

	test.each([
		{
			path: 'core-rules/1.2.mdx',
			title: 'Core Rules 1.2 (Spiritforged)',
			sidebarTitle: 'Core Rules',
		},
		{
			path: 'core-rules/(archive)/1.1.mdx',
			title: 'Core Rules 1.1 (Origins)',
			sidebarTitle: 'Origins Core Rules',
		},
		{
			path: 'core-rules/changes/1.1.mdx',
			title: 'Core Rules 1.1 Changes (Origins)',
			sidebarTitle: 'Origins Changes',
		},
		{
			path: 'tournament-rules/2026-04-29.mdx',
			title: 'Tournament Rules (April 29, 2026)',
			sidebarTitle: 'Tournament Rules',
		},
		{
			path: 'tournament-rules/(archive)/2026-03-30.mdx',
			title: 'Tournament Rules (March 30, 2026)',
			sidebarTitle: 'March 2026 Tournament Rules',
		},
		{
			path: 'tournament-rules/changes/2026-03-30.mdx',
			title: 'Tournament Rules Changes (March 30, 2026)',
			sidebarTitle: 'March 2026 Changes',
		},
	])('separates the canonical and sidebar titles for $path', async ({ path, title, sidebarTitle }) => {
		const { artifacts } = await prepareReferencePages(MANIFEST, {
			coreRules: PREPARED_CORE_RULES,
			tournamentRules: PREPARED_TOURNAMENT_RULES,
		})

		expect(artifacts.get(path)).toContain(`title: "${title}"`)
		expect(artifacts.get(path)).toContain(`sidebarTitle: "${sidebarTitle}"`)
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
		expect(artifacts.get('tournament-rules/(archive)/2026-03-30.mdx')).toMatch(
			/Archived reference[\s\S]+\/reference\/tournament-rules\/2026-04-29[\s\S]+<TournamentRulesDocument \/>/u,
		)
	})

	test('preserves history prose from tracked templates', async () => {
		const { artifacts } = await prepareReferencePages(MANIFEST, {
			coreRules: PREPARED_CORE_RULES,
			tournamentRules: PREPARED_TOURNAMENT_RULES,
		})

		const overview = artifacts.get('index.mdx')
		expect(overview).toMatch(/## Core Rules \[#core-rules\]/u)
		expect(overview).toMatch(/href="\/reference\/core-rules\/1\.2"/u)
		expect(overview).toMatch(/## Tournament Rules \[#tournament-rules\]/u)
		expect(overview).toMatch(/href="\/reference\/tournament-rules\/2026-04-29"/u)
		expect(overview).toMatch(/Changes from March 30 to April 29, 2026\./u)
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
