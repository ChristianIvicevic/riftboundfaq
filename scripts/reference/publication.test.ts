import { access, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, onTestFinished, test } from 'vitest'
import type { ExtractedCoreRulesFamily, ExtractedTournamentRulesFamily } from '../rules-document-family'
import { parseRulesManifest } from '../rules-manifest'
import { prepareReferencePublication, ReferencePublicationError } from './publication'

const PROJECT_DIRECTORY = join(import.meta.dirname, '..', '..')

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

function coreVersion(
	registeredVersion: (typeof MANIFEST.coreRules.registeredVersions)[number],
	lastUpdated: string,
): ExtractedCoreRulesFamily['versions'][number] {
	return {
		registeredVersion,
		lastUpdated,
		document: { schemaVersion: 3, version: registeredVersion.version, sections: [] },
		transcript: registeredVersion.name ? '' : null,
		diagnostics: [],
	}
}

const coreVersions: ExtractedCoreRulesFamily['versions'] = [
	coreVersion(MANIFEST.coreRules.registeredVersions[0], '2025-06-02'),
	coreVersion(MANIFEST.coreRules.registeredVersions[1], '2025-10-01'),
	coreVersion(MANIFEST.coreRules.registeredVersions[2], '2025-12-01'),
]
const EXTRACTED_CORE_RULES: ExtractedCoreRulesFamily = {
	versions: coreVersions,
	currentVersion: coreVersions[2],
}

function tournamentVersion(
	registeredVersion: (typeof MANIFEST.tournamentRules.registeredVersions)[number],
): ExtractedTournamentRulesFamily['versions'][number] {
	return {
		registeredVersion,
		lastUpdated: registeredVersion.version,
		document: { schemaVersion: 1, version: registeredVersion.version, sections: [] },
		transcript: '',
		diagnostics: [],
	}
}

const tournamentVersions: ExtractedTournamentRulesFamily['versions'] = [
	tournamentVersion(MANIFEST.tournamentRules.registeredVersions[0]),
	tournamentVersion(MANIFEST.tournamentRules.registeredVersions[1]),
	tournamentVersion(MANIFEST.tournamentRules.registeredVersions[2]),
]
const EXTRACTED_TOURNAMENT_RULES: ExtractedTournamentRulesFamily = {
	versions: tournamentVersions,
	currentVersion: tournamentVersions[2],
}

async function createTemplates(directory: string): Promise<void> {
	await mkdir(directory, { recursive: true })
	await Promise.all([
		writeFile(
			join(directory, 'index.mdx'),
			'core current: {{CORE_RULES_CURRENT_VERSION_ROUTE}}\ncore changes:\n{{CORE_RULES_CHANGES}}\ncore archive:\n{{CORE_RULES_ARCHIVE}}\ntournament current: {{TOURNAMENT_RULES_CURRENT_VERSION_ROUTE}}\ntournament changes:\n{{TOURNAMENT_RULES_CHANGES}}\ntournament archive:\n{{TOURNAMENT_RULES_ARCHIVE}}\n',
		),
		writeFile(join(directory, 'meta.json.template'), '{\n\t"pages": [\n{{PAGES}}\n\t]\n}\n'),
		writeFile(
			join(directory, 'group-meta.json.template'),
			'{\n\t"title": "{{TITLE}}",\n\t"defaultOpen": false,\n\t"collapsible": true,\n\t"pages": [\n{{PAGES}}\n\t]\n}\n',
		),
		writeFile(
			join(directory, 'core-rules-current.mdx'),
			'---\n{{RULES_DOCUMENT_FRONTMATTER}}\n---\ncurrent core {{TITLE}}|{{CREATED_AT}}\n<RulesDocument />',
		),
		writeFile(
			join(directory, 'core-rules-archive.mdx'),
			'---\n{{RULES_DOCUMENT_FRONTMATTER}}\n---\n{{TITLE}}|{{SIDEBAR_TITLE}}|{{DESCRIPTION}}|{{CREATED_AT}}|{{CURRENT_VERSION_ROUTE}}\n<RulesDocument />',
		),
		writeFile(
			join(directory, 'core-rules-change.mdx'),
			'{{TITLE}}|{{SIDEBAR_TITLE}}|{{DESCRIPTION}}|{{FROM}}|{{TO}}|{{CREATED_AT}}',
		),
		writeFile(
			join(directory, 'tournament-rules-current.mdx'),
			'---\n{{RULES_DOCUMENT_FRONTMATTER}}\n---\ncurrent tournament {{TITLE}}|{{CREATED_AT}}\n<RulesDocument />',
		),
		writeFile(
			join(directory, 'tournament-rules-archive.mdx'),
			'---\n{{RULES_DOCUMENT_FRONTMATTER}}\n---\n{{TITLE}}|{{SIDEBAR_TITLE}}|{{DESCRIPTION}}|{{CREATED_AT}}|{{CURRENT_VERSION_ROUTE}}\n<RulesDocument />',
		),
		writeFile(
			join(directory, 'tournament-rules-change.mdx'),
			'{{TITLE}}|{{SIDEBAR_TITLE}}|{{DESCRIPTION}}|{{FROM}}|{{TO}}|{{CREATED_AT}}',
		),
	])
}

async function createReferenceWorkspace() {
	const temporaryDirectory = await mkdtemp(join(tmpdir(), 'riftbound-reference-'))
	onTestFinished(() => rm(temporaryDirectory, { recursive: true }))
	const templatesDirectory = join(temporaryDirectory, 'templates', 'reference')
	await createTemplates(templatesDirectory)
	return {
		projectDirectory: temporaryDirectory,
	}
}

function prepareFixture() {
	return prepareReferencePublication({
		projectDirectory: PROJECT_DIRECTORY,
		coreRules: EXTRACTED_CORE_RULES,
		tournamentRules: EXTRACTED_TOURNAMENT_RULES,
	})
}

describe('prepareReferencePublication', () => {
	test('preserves archived Core Rules frontmatter and document marker from tracked templates', async () => {
		const { artifacts, summary } = await prepareFixture()

		expect(artifacts.get('core-rules/(archive)/1.0.mdx')).toMatch(
			/createdAt: "2025-06-02"[\s\S]+version: "1\.0"[\s\S]+noindex: true[\s\S]+Archived reference[\s\S]+\/reference\/core-rules\/1\.2[\s\S]+<RulesDocument \/>/u,
		)
		expect(summary.pages).toBe(11)
	})

	test('selects current documents by explicit version', async () => {
		const { artifacts } = await prepareFixture()

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
		const { artifacts } = await prepareFixture()

		expect(artifacts.get(path)).toContain(`title: "${title}"`)
		expect(artifacts.get(path)).toContain(`sidebarTitle: "${sidebarTitle}"`)
	})

	test('preserves Core Rules diff components from tracked templates', async () => {
		const { artifacts } = await prepareFixture()

		expect(artifacts.get('core-rules/changes/1.1.mdx')).toMatch(
			/noindex: true[\s\S]+<CoreRulesDiff from="1\.0" to="1\.1" \/>/u,
		)
	})

	test('preserves Tournament Rules diff and document markers from tracked templates', async () => {
		const { artifacts } = await prepareFixture()

		expect(artifacts.get('tournament-rules/changes/2026-04-29.mdx')).toMatch(
			/<TournamentRulesDiff[\s\S]+from="2026-03-30"[\s\S]+to="2026-04-29"[\s\S]+includeChangeDescriptions/u,
		)
		expect(artifacts.get('tournament-rules/(archive)/2026-03-30.mdx')).toMatch(
			/Archived reference[\s\S]+\/reference\/tournament-rules\/2026-04-29[\s\S]+<RulesDocument \/>/u,
		)
	})

	test('rejects a Versioned rules route artifact without its document marker', async () => {
		const { projectDirectory } = await createReferenceWorkspace()
		await writeFile(
			join(projectDirectory, 'templates', 'reference', 'core-rules-current.mdx'),
			'---\n{{RULES_DOCUMENT_FRONTMATTER}}\n---\ncurrent core {{TITLE}}|{{CREATED_AT}}',
		)

		await expect(
			prepareReferencePublication({
				projectDirectory,
				coreRules: EXTRACTED_CORE_RULES,
				tournamentRules: EXTRACTED_TOURNAMENT_RULES,
			}),
		).rejects.toMatchObject({ stage: 'artifacts' })
	})

	test('rejects a Versioned rules route artifact with a second identity', async () => {
		const { projectDirectory } = await createReferenceWorkspace()
		await writeFile(
			join(projectDirectory, 'templates', 'reference', 'core-rules-current.mdx'),
			'---\n{{RULES_DOCUMENT_FRONTMATTER}}\nrulesDocument:\n  type: "core-rules"\n  version: "1.1"\n---\n{{TITLE}}|{{CREATED_AT}}\n<RulesDocument />',
		)

		await expect(
			prepareReferencePublication({
				projectDirectory,
				coreRules: EXTRACTED_CORE_RULES,
				tournamentRules: EXTRACTED_TOURNAMENT_RULES,
			}),
		).rejects.toMatchObject({ stage: 'artifacts' })
	})

	test('rejects an inline second identity in a Versioned rules route artifact', async () => {
		const { projectDirectory } = await createReferenceWorkspace()
		await writeFile(
			join(projectDirectory, 'templates', 'reference', 'core-rules-current.mdx'),
			'---\n{{RULES_DOCUMENT_FRONTMATTER}}\nrulesDocument: { type: "core-rules", version: "1.1" }\n---\n{{TITLE}}|{{CREATED_AT}}\n<RulesDocument />',
		)

		await expect(
			prepareReferencePublication({
				projectDirectory,
				coreRules: EXTRACTED_CORE_RULES,
				tournamentRules: EXTRACTED_TOURNAMENT_RULES,
			}),
		).rejects.toMatchObject({ stage: 'artifacts' })
	})

	test('rejects a canonical identity outside frontmatter', async () => {
		const { projectDirectory } = await createReferenceWorkspace()
		await writeFile(
			join(projectDirectory, 'templates', 'reference', 'core-rules-current.mdx'),
			'---\ntitle: "{{TITLE}}"\ncreatedAt: "{{CREATED_AT}}"\n---\n{{RULES_DOCUMENT_FRONTMATTER}}\n<RulesDocument />',
		)

		await expect(
			prepareReferencePublication({
				projectDirectory,
				coreRules: EXTRACTED_CORE_RULES,
				tournamentRules: EXTRACTED_TOURNAMENT_RULES,
			}),
		).rejects.toMatchObject({ stage: 'artifacts' })
	})

	test.each([
		{
			problem: 'duplicate document marker',
			suffix: '<RulesDocument />\n<RulesDocument />',
		},
		{
			problem: 'legacy family marker',
			suffix: '<RulesDocument />\n<CoreRulesDocument />',
		},
	])('rejects a Versioned rules route artifact with a $problem', async ({ suffix }) => {
		const { projectDirectory } = await createReferenceWorkspace()
		await writeFile(
			join(projectDirectory, 'templates', 'reference', 'core-rules-current.mdx'),
			`---\n{{RULES_DOCUMENT_FRONTMATTER}}\n---\n{{TITLE}}|{{CREATED_AT}}\n${suffix}`,
		)

		await expect(
			prepareReferencePublication({
				projectDirectory,
				coreRules: EXTRACTED_CORE_RULES,
				tournamentRules: EXTRACTED_TOURNAMENT_RULES,
			}),
		).rejects.toMatchObject({ stage: 'artifacts' })
	})

	test('preserves history prose from tracked templates', async () => {
		const { artifacts } = await prepareFixture()

		const overview = artifacts.get('index.mdx')
		expect(overview).toMatch(/## Core Rules \[#core-rules\]/u)
		expect(overview).toMatch(/href="\/reference\/core-rules\/1\.2"/u)
		expect(overview).toMatch(/## Tournament Rules \[#tournament-rules\]/u)
		expect(overview).toMatch(/href="\/reference\/tournament-rules\/2026-04-29"/u)
		expect(overview).toMatch(/Changes from March 30 to April 29, 2026\./u)
	})

	test('rejects an invalid parsed Last Updated date', async () => {
		const { projectDirectory } = await createReferenceWorkspace()

		await expect(
			prepareReferencePublication({
				projectDirectory,
				coreRules: {
					...EXTRACTED_CORE_RULES,
					versions: [
						EXTRACTED_CORE_RULES.versions[0],
						{ ...EXTRACTED_CORE_RULES.versions[1], lastUpdated: 'not a date' },
						EXTRACTED_CORE_RULES.versions[2],
					],
				},
				tournamentRules: EXTRACTED_TOURNAMENT_RULES,
			}),
		).rejects.toThrow(/Core Rules 1\.1 Last Updated "not a date" is not a recognized date/u)
	})

	test('rejects a current rules version that is not the greatest registered version', async () => {
		const preparation = prepareReferencePublication({
			projectDirectory: PROJECT_DIRECTORY,
			coreRules: {
				...EXTRACTED_CORE_RULES,
				currentVersion: EXTRACTED_CORE_RULES.versions[0],
			},
			tournamentRules: EXTRACTED_TOURNAMENT_RULES,
		})

		await expect(preparation).rejects.toBeInstanceOf(ReferencePublicationError)
		await expect(preparation).rejects.toMatchObject({ stage: 'history' })
	})

	test('prepares current pages and empty history groups for one-version families', async () => {
		const { artifacts, summary } = await prepareReferencePublication({
			projectDirectory: PROJECT_DIRECTORY,
			coreRules: {
				versions: [EXTRACTED_CORE_RULES.versions[0]],
				currentVersion: EXTRACTED_CORE_RULES.versions[0],
			},
			tournamentRules: {
				versions: [EXTRACTED_TOURNAMENT_RULES.versions[0]],
				currentVersion: EXTRACTED_TOURNAMENT_RULES.versions[0],
			},
		})

		expect(summary.pages).toBe(3)
		expect(artifacts.size).toBe(8)
		expect(artifacts.get('core-rules/changes/meta.json')).toContain('"pages": [\n\n\t]')
		expect(artifacts.has('core-rules/changes/1.0.mdx')).toBe(false)
		expect(artifacts.has('core-rules/(archive)/1.0.mdx')).toBe(false)
	})

	test('rejects a rules document family that is not in canonical order', async () => {
		await expect(
			prepareReferencePublication({
				projectDirectory: PROJECT_DIRECTORY,
				coreRules: {
					versions: [EXTRACTED_CORE_RULES.versions[1], EXTRACTED_CORE_RULES.versions[0]],
					currentVersion: EXTRACTED_CORE_RULES.versions[0],
				},
				tournamentRules: EXTRACTED_TOURNAMENT_RULES,
			}),
		).rejects.toMatchObject({ stage: 'history' })
	})

	test('rejects empty and duplicate rules document family histories', async () => {
		const emptyCoreRules = {
			...EXTRACTED_CORE_RULES,
			versions: [],
		} as unknown as ExtractedCoreRulesFamily
		const duplicateCoreRules: ExtractedCoreRulesFamily = {
			versions: [EXTRACTED_CORE_RULES.versions[0], EXTRACTED_CORE_RULES.versions[0]],
			currentVersion: EXTRACTED_CORE_RULES.versions[0],
		}

		await expect(
			prepareReferencePublication({
				projectDirectory: PROJECT_DIRECTORY,
				coreRules: emptyCoreRules,
				tournamentRules: EXTRACTED_TOURNAMENT_RULES,
			}),
		).rejects.toMatchObject({ stage: 'history', cause: expect.any(Error) })
		await expect(
			prepareReferencePublication({
				projectDirectory: PROJECT_DIRECTORY,
				coreRules: duplicateCoreRules,
				tournamentRules: EXTRACTED_TOURNAMENT_RULES,
			}),
		).rejects.toMatchObject({ stage: 'history', cause: expect.any(Error) })
	})

	test('rejects invalid Core Rules and Tournament Rules version syntax', async () => {
		const invalidCoreVersion = {
			...EXTRACTED_CORE_RULES.versions[0],
			registeredVersion: {
				...EXTRACTED_CORE_RULES.versions[0].registeredVersion,
				version: '2.0',
			},
		}
		const invalidTournamentVersion = {
			...EXTRACTED_TOURNAMENT_RULES.versions[0],
			registeredVersion: {
				...EXTRACTED_TOURNAMENT_RULES.versions[0].registeredVersion,
				version: 'not-a-date',
			},
		}

		await expect(
			prepareReferencePublication({
				projectDirectory: PROJECT_DIRECTORY,
				coreRules: { versions: [invalidCoreVersion], currentVersion: invalidCoreVersion },
				tournamentRules: EXTRACTED_TOURNAMENT_RULES,
			}),
		).rejects.toMatchObject({ stage: 'history' })
		await expect(
			prepareReferencePublication({
				projectDirectory: PROJECT_DIRECTORY,
				coreRules: EXTRACTED_CORE_RULES,
				tournamentRules: {
					versions: [invalidTournamentVersion],
					currentVersion: invalidTournamentVersion,
				},
			}),
		).rejects.toMatchObject({ stage: 'history' })
	})

	test('returns the complete artifact set without writing generated output', async () => {
		const { projectDirectory } = await createReferenceWorkspace()
		const { artifacts } = await prepareReferencePublication({
			projectDirectory,
			coreRules: EXTRACTED_CORE_RULES,
			tournamentRules: EXTRACTED_TOURNAMENT_RULES,
		})

		expect([...artifacts.keys()]).toEqual([
			'index.mdx',
			'meta.json',
			'core-rules/changes/meta.json',
			'core-rules/(archive)/meta.json',
			'tournament-rules/changes/meta.json',
			'tournament-rules/(archive)/meta.json',
			'core-rules/1.2.mdx',
			'core-rules/(archive)/1.0.mdx',
			'core-rules/(archive)/1.1.mdx',
			'core-rules/changes/1.1.mdx',
			'core-rules/changes/1.2.mdx',
			'tournament-rules/2026-04-29.mdx',
			'tournament-rules/(archive)/2025-07-21.mdx',
			'tournament-rules/(archive)/2026-03-30.mdx',
			'tournament-rules/changes/2026-03-30.mdx',
			'tournament-rules/changes/2026-04-29.mdx',
		])
		await expect(access(join(projectDirectory, 'content', 'reference'))).rejects.toMatchObject({
			code: 'ENOENT',
		})
	})

	test('identifies a missing tracked template as a template-stage failure', async () => {
		const { projectDirectory } = await createReferenceWorkspace()
		await rm(join(projectDirectory, 'templates', 'reference', 'index.mdx'))

		await expect(
			prepareReferencePublication({
				projectDirectory,
				coreRules: EXTRACTED_CORE_RULES,
				tournamentRules: EXTRACTED_TOURNAMENT_RULES,
			}),
		).rejects.toMatchObject({ stage: 'templates' })
	})

	test('identifies an unresolved placeholder as a render-stage failure', async () => {
		const { projectDirectory } = await createReferenceWorkspace()
		await writeFile(
			join(projectDirectory, 'templates', 'reference', 'group-meta.json.template'),
			'{{TITLE}}|{{PAGES}}|{{UNKNOWN}}',
		)

		await expect(
			prepareReferencePublication({
				projectDirectory,
				coreRules: EXTRACTED_CORE_RULES,
				tournamentRules: EXTRACTED_TOURNAMENT_RULES,
			}),
		).rejects.toMatchObject({ stage: 'render' })
	})
})
