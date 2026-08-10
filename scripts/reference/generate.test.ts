import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, onTestFinished, test } from 'vitest'
import type { ExtractedCoreRulesFamily, ExtractedTournamentRulesFamily } from '../rules-document-family.ts'
import { parseRulesManifest } from '../rules-manifest.ts'
import { prepareReferencePages, type ReferencePreparationInputs } from './generate.ts'

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

function referenceVersion<RegisteredVersion>({
	registeredVersion,
	lastUpdated,
}: {
	registeredVersion: RegisteredVersion
	lastUpdated: string
}) {
	return { registeredVersion, lastUpdated }
}

const CORE_REFERENCE_VERSIONS: ReferencePreparationInputs['coreRules'] = [
	referenceVersion(EXTRACTED_CORE_RULES.versions[0]),
	referenceVersion(EXTRACTED_CORE_RULES.versions[1]),
	referenceVersion(EXTRACTED_CORE_RULES.versions[2]),
]
const TOURNAMENT_REFERENCE_VERSIONS: ReferencePreparationInputs['tournamentRules'] = [
	referenceVersion(EXTRACTED_TOURNAMENT_RULES.versions[0]),
	referenceVersion(EXTRACTED_TOURNAMENT_RULES.versions[1]),
	referenceVersion(EXTRACTED_TOURNAMENT_RULES.versions[2]),
]

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

describe('prepareReferencePages', () => {
	test('preserves archived Core Rules frontmatter and components from tracked templates', async () => {
		const { artifacts, summary } = await prepareReferencePages(MANIFEST, {
			coreRules: CORE_REFERENCE_VERSIONS,
			tournamentRules: TOURNAMENT_REFERENCE_VERSIONS,
		})

		expect(artifacts.get('core-rules/(archive)/1.0.mdx')).toMatch(
			/createdAt: "2025-06-02"[\s\S]+version: "1\.0"[\s\S]+noindex: true[\s\S]+Archived reference[\s\S]+\/reference\/core-rules\/1\.2[\s\S]+<CoreRulesDocument \/>/u,
		)
		expect(summary.pages).toBe(11)
	})

	test('selects current documents by explicit version', async () => {
		const { artifacts } = await prepareReferencePages(MANIFEST, {
			coreRules: CORE_REFERENCE_VERSIONS,
			tournamentRules: TOURNAMENT_REFERENCE_VERSIONS,
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
			coreRules: CORE_REFERENCE_VERSIONS,
			tournamentRules: TOURNAMENT_REFERENCE_VERSIONS,
		})

		expect(artifacts.get(path)).toContain(`title: "${title}"`)
		expect(artifacts.get(path)).toContain(`sidebarTitle: "${sidebarTitle}"`)
	})

	test('preserves Core Rules diff components from tracked templates', async () => {
		const { artifacts } = await prepareReferencePages(MANIFEST, {
			coreRules: CORE_REFERENCE_VERSIONS,
			tournamentRules: TOURNAMENT_REFERENCE_VERSIONS,
		})

		expect(artifacts.get('core-rules/changes/1.1.mdx')).toMatch(
			/noindex: true[\s\S]+<CoreRulesDiff from="1\.0" to="1\.1" \/>/u,
		)
	})

	test('preserves Tournament Rules components from tracked templates', async () => {
		const { artifacts } = await prepareReferencePages(MANIFEST, {
			coreRules: CORE_REFERENCE_VERSIONS,
			tournamentRules: TOURNAMENT_REFERENCE_VERSIONS,
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
			coreRules: CORE_REFERENCE_VERSIONS,
			tournamentRules: TOURNAMENT_REFERENCE_VERSIONS,
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
				coreRules: [
					CORE_REFERENCE_VERSIONS[0],
					{ ...CORE_REFERENCE_VERSIONS[1], lastUpdated: 'not a date' },
					CORE_REFERENCE_VERSIONS[2],
				],
				tournamentRules: TOURNAMENT_REFERENCE_VERSIONS,
				templatesDirectory,
			}),
		).rejects.toThrow(/Core Rules 1\.1 Last Updated "not a date" is not a recognized date/u)
	})
})
