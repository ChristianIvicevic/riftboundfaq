import { access, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { normalizeRulesDate } from '../rules-date.ts'

const PROJECT_DIRECTORY = join(import.meta.dirname, '..', '..')
const DEFAULT_TEMPLATES_DIRECTORY = join(PROJECT_DIRECTORY, 'templates', 'reference')
const DEFAULT_OUTPUT_DIRECTORY = join(PROJECT_DIRECTORY, 'content', 'reference')
const PLACEHOLDER = /\{\{([A-Z_]+)\}\}/gu

const TEMPLATE_FILES = [
	'index.mdx',
	'meta.json.template',
	'core-rules-current.mdx',
	'core-rules-archive.mdx',
	'core-rules-change.mdx',
	'tournament-rules-current.mdx',
	'tournament-rules-archive.mdx',
	'tournament-rules-change.mdx',
] as const

type CoreVersionMetadata = { name?: string }
type VersionFamily<Metadata> = { current: string; versions: Record<string, Metadata> }
type RulesManifest = {
	coreRules: VersionFamily<CoreVersionMetadata>
	tournamentRules: VersionFamily<Record<string, unknown>>
}
type ReferenceVersion = { version: string; lastUpdated: unknown }
type PreparedRulesForReference = { referenceVersions?: readonly ReferenceVersion[] }
type VersionPair = { from: string; to: string }
type TemplateFile = (typeof TEMPLATE_FILES)[number]

export type ReferencePreparationInputs = {
	coreRules: PreparedRulesForReference
	tournamentRules: PreparedRulesForReference
	templatesDirectory?: string
}

export type PreparedReferencePages = {
	artifacts: Map<string, string>
	summary: { pages: number }
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function readManifest(value: unknown): RulesManifest {
	if (!isRecord(value) || !isRecord(value.coreRules) || !isRecord(value.tournamentRules)) {
		throw new TypeError('expected rules version metadata')
	}
	const coreRules = value.coreRules
	const tournamentRules = value.tournamentRules
	if (!isRecord(coreRules.versions) || !isRecord(tournamentRules.versions)) {
		throw new TypeError('expected rules version metadata')
	}
	if (typeof coreRules.current !== 'string' || typeof tournamentRules.current !== 'string') {
		throw new TypeError('expected rules version metadata')
	}
	return {
		coreRules: {
			current: coreRules.current,
			versions: coreRules.versions as Record<string, CoreVersionMetadata>,
		},
		tournamentRules: {
			current: tournamentRules.current,
			versions: tournamentRules.versions as Record<string, Record<string, unknown>>,
		},
	}
}

function compareCoreVersions(left: string, right: string): number {
	return left.localeCompare(right, 'en', { numeric: true })
}

function renderTemplate(template: string, values: Record<string, string>, filename: string): string {
	let rendered = template
	for (const [name, value] of Object.entries(values)) {
		const marker = `{{${name}}}`
		if (!rendered.includes(marker)) throw new Error(`${filename}: missing ${marker}`)
		rendered = rendered.replaceAll(marker, value)
	}
	const unknown = [...rendered.matchAll(PLACEHOLDER)].map((match) => match[0])
	if (unknown.length > 0) throw new Error(`${filename}: unresolved placeholders ${unknown.join(', ')}`)
	return rendered
}

function coreTitle(version: string, name?: string): string {
	return name ? `${name} Core Rules` : `Core Rules ${version}`
}

function coreVersionLabel(version: string, name?: string): string {
	return `${version}${name ? ` (${name})` : ''}`
}

function coreChangeTitle(version: string, name?: string): string {
	return name ? `${name} Changes` : `Core Rules ${version} Changes`
}

function dateFromIso(value: string): Date {
	return new Date(`${value}T00:00:00Z`)
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat('en-US', {
		day: 'numeric',
		month: 'long',
		timeZone: 'UTC',
		year: 'numeric',
	}).format(dateFromIso(value))
}

function formatMonthYear(value: string): string {
	return new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC', year: 'numeric' }).format(
		dateFromIso(value),
	)
}

function adjacentVersionPairs(versions: readonly string[]): VersionPair[] {
	return versions.slice(1).map((version, index) => ({ from: versions[index], to: version }))
}

function formatDateRange(from: string, to: string): string {
	const fromDate = dateFromIso(from)
	const toDate = dateFromIso(to)
	if (fromDate.getUTCFullYear() !== toDate.getUTCFullYear()) return `${formatDate(from)} to ${formatDate(to)}`
	const fromMonthDay = new Intl.DateTimeFormat('en-US', {
		day: 'numeric',
		month: 'long',
		timeZone: 'UTC',
	}).format(fromDate)
	return `${fromMonthDay} to ${formatDate(to)}`
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path)
		return true
	} catch (error: unknown) {
		if (isRecord(error) && error.code === 'ENOENT') return false
		throw error
	}
}

function referenceDates(
	prepared: PreparedRulesForReference,
	family: string,
	versions: readonly string[],
): Map<string, string> {
	const entries = prepared.referenceVersions ?? []
	const dates = new Map(
		entries.map(({ version, lastUpdated }) => [
			version,
			normalizeRulesDate(lastUpdated, `${family} ${version} Last Updated`),
		]),
	)
	for (const version of versions) {
		if (!dates.has(version)) throw new Error(`${family} ${version}: missing parsed Last Updated date`)
	}
	return dates
}

function currentMustBeGreatest(family: string, current: string, versions: readonly string[]): void {
	const greatest = versions.at(-1)
	if (current !== greatest) {
		throw new Error(
			`current ${family} version ${current} must be the greatest registered version ${greatest}`,
		)
	}
}

function coreChangeTiles(
	changes: readonly VersionPair[],
	metadata: Record<string, CoreVersionMetadata>,
): string {
	return changes
		.toReversed()
		.map(({ from, to }) => {
			const name = metadata[to].name
			return `\t<Tile href="/reference/core-rules/changes/${to}" title="${coreChangeTitle(to, name)}">\n\t\tChanges from Core Rules ${from} to ${to}.\n\t</Tile>`
		})
		.join('\n')
}

function coreArchiveTiles(
	versions: readonly string[],
	metadata: Record<string, CoreVersionMetadata>,
): string {
	return versions
		.toReversed()
		.map(
			(version) =>
				`\t<Tile href="/reference/core-rules/${version}" title="${coreTitle(version, metadata[version].name)}">\n\t\tArchived Core Rules version ${version}.\n\t</Tile>`,
		)
		.join('\n')
}

function tournamentChangeTiles(changes: readonly VersionPair[]): string {
	return changes
		.toReversed()
		.map(
			({ from, to }) =>
				`\t<Tile href="/reference/tournament-rules/changes/${to}" title="${formatMonthYear(to)} Changes">\n\t\tChanges from ${formatDateRange(from, to)}.\n\t</Tile>`,
		)
		.join('\n')
}

function tournamentArchiveTiles(versions: readonly string[]): string {
	return versions
		.toReversed()
		.map(
			(version) =>
				`\t<Tile href="/reference/tournament-rules/${version}" title="${formatMonthYear(version)} Tournament Rules">\n\t\tArchived Tournament Rules dated ${formatDate(version)}.\n\t</Tile>`,
		)
		.join('\n')
}

function navigationPages(
	coreVersions: readonly string[],
	coreChanges: readonly VersionPair[],
	tournamentVersions: readonly string[],
	tournamentChanges: readonly VersionPair[],
): string {
	return [
		'index',
		'---Current Documents---',
		'core-rules/index',
		'tournament-rules/index',
		'---Core Rules Changes---',
		...coreChanges.toReversed().map(({ to }) => `core-rules/changes/${to}`),
		'---Tournament Rules Changes---',
		...tournamentChanges.toReversed().map(({ to }) => `tournament-rules/changes/${to}`),
		'---Archived Core Rules---',
		...coreVersions.toReversed().map((version) => `core-rules/${version}`),
		'---Archived Tournament Rules---',
		...tournamentVersions.toReversed().map((version) => `tournament-rules/${version}`),
	]
		.map((page) => `\t\t${JSON.stringify(page)}`)
		.join(',\n')
}

export async function prepareReferencePages(
	rawManifest: unknown,
	{
		coreRules,
		tournamentRules,
		templatesDirectory = DEFAULT_TEMPLATES_DIRECTORY,
	}: ReferencePreparationInputs,
): Promise<PreparedReferencePages> {
	const manifest = readManifest(rawManifest)
	const coreMetadata = manifest.coreRules.versions
	const tournamentMetadata = manifest.tournamentRules.versions
	const coreVersions = Object.keys(coreMetadata).toSorted(compareCoreVersions)
	const tournamentVersions = Object.keys(tournamentMetadata).toSorted()
	currentMustBeGreatest('Core Rules', manifest.coreRules.current, coreVersions)
	currentMustBeGreatest('Tournament Rules', manifest.tournamentRules.current, tournamentVersions)
	const coreDates = referenceDates(coreRules, 'Core Rules', coreVersions)
	const tournamentDates = referenceDates(tournamentRules, 'Tournament Rules', tournamentVersions)
	const coreArchivedVersions = coreVersions.slice(0, -1)
	const tournamentArchivedVersions = tournamentVersions.slice(0, -1)
	const coreChanges = adjacentVersionPairs(coreVersions)
	const tournamentChanges = adjacentVersionPairs(tournamentVersions)
	const templates = Object.fromEntries(
		await Promise.all(
			TEMPLATE_FILES.map(async (filename) => [
				filename,
				await readFile(join(templatesDirectory, filename), 'utf8'),
			]),
		),
	) as Record<TemplateFile, string>
	const artifacts = new Map<string, string>([
		[
			'index.mdx',
			renderTemplate(
				templates['index.mdx'],
				{
					CORE_RULES_ARCHIVE: coreArchiveTiles(coreArchivedVersions, coreMetadata),
					CORE_RULES_CHANGES: coreChangeTiles(coreChanges, coreMetadata),
					TOURNAMENT_RULES_ARCHIVE: tournamentArchiveTiles(tournamentArchivedVersions),
					TOURNAMENT_RULES_CHANGES: tournamentChangeTiles(tournamentChanges),
				},
				'index.mdx',
			),
		],
		[
			'meta.json',
			renderTemplate(
				templates['meta.json.template'],
				{
					PAGES: navigationPages(
						coreArchivedVersions,
						coreChanges,
						tournamentArchivedVersions,
						tournamentChanges,
					),
				},
				'meta.json.template',
			),
		],
		[
			'core-rules/index.mdx',
			renderTemplate(
				templates['core-rules-current.mdx'],
				{ CREATED_AT: coreDates.get(manifest.coreRules.current)! },
				'core-rules-current.mdx',
			),
		],
		[
			'tournament-rules/index.mdx',
			renderTemplate(
				templates['tournament-rules-current.mdx'],
				{ CREATED_AT: tournamentDates.get(manifest.tournamentRules.current)! },
				'tournament-rules-current.mdx',
			),
		],
	])

	for (const version of coreArchivedVersions) {
		const name = coreMetadata[version].name
		artifacts.set(
			`core-rules/${version}.mdx`,
			renderTemplate(
				templates['core-rules-archive.mdx'],
				{
					CREATED_AT: coreDates.get(version)!,
					DESCRIPTION: `Archived snapshot of the Riftbound Core Rules Document as of version ${coreVersionLabel(version, name)}.`,
					TITLE: coreTitle(version, name),
					VERSION: version,
				},
				'core-rules-archive.mdx',
			),
		)
	}
	for (const { from, to } of coreChanges) {
		artifacts.set(
			`core-rules/changes/${to}.mdx`,
			renderTemplate(
				templates['core-rules-change.mdx'],
				{
					CREATED_AT: coreDates.get(to)!,
					DESCRIPTION: `Changes between Riftbound Core Rules ${coreVersionLabel(from, coreMetadata[from].name)} and ${coreVersionLabel(to, coreMetadata[to].name)}.`,
					FROM: from,
					TITLE: coreChangeTitle(to, coreMetadata[to].name),
					TO: to,
				},
				'core-rules-change.mdx',
			),
		)
	}
	for (const version of tournamentArchivedVersions) {
		artifacts.set(
			`tournament-rules/${version}.mdx`,
			renderTemplate(
				templates['tournament-rules-archive.mdx'],
				{
					CREATED_AT: tournamentDates.get(version)!,
					DESCRIPTION: `Archived snapshot of the Riftbound Tournament Rules last updated ${formatDate(version)}.`,
					TITLE: `${formatMonthYear(version)} Tournament Rules`,
					VERSION: version,
				},
				'tournament-rules-archive.mdx',
			),
		)
	}
	for (const { from, to } of tournamentChanges) {
		artifacts.set(
			`tournament-rules/changes/${to}.mdx`,
			renderTemplate(
				templates['tournament-rules-change.mdx'],
				{
					CREATED_AT: tournamentDates.get(to)!,
					DESCRIPTION: `Changes between the ${formatMonthYear(from)} and ${formatMonthYear(to)} Riftbound Tournament Rules.`,
					FROM: from,
					TITLE: `${formatMonthYear(to)} Changes`,
					TO: to,
				},
				'tournament-rules-change.mdx',
			),
		)
	}

	return { artifacts, summary: { pages: artifacts.size } }
}

export async function publishReferencePages(
	{ artifacts }: PreparedReferencePages,
	{ outputDirectory = DEFAULT_OUTPUT_DIRECTORY }: { outputDirectory?: string } = {},
): Promise<void> {
	const parentDirectory = dirname(outputDirectory)
	await mkdir(parentDirectory, { recursive: true })
	const stagingDirectory = await mkdtemp(join(parentDirectory, `${basename(outputDirectory)}.tmp-`))
	const backupDirectory = `${stagingDirectory}.previous`
	let hasBackup = false
	try {
		await Promise.all(
			[...artifacts].map(async ([relativePath, contents]) => {
				const outputPath = join(stagingDirectory, relativePath)
				await mkdir(dirname(outputPath), { recursive: true })
				await writeFile(outputPath, contents)
			}),
		)
		if (await pathExists(outputDirectory)) {
			await rename(outputDirectory, backupDirectory)
			hasBackup = true
		}
		try {
			await rename(stagingDirectory, outputDirectory)
		} catch (error) {
			if (hasBackup) await rename(backupDirectory, outputDirectory)
			throw error
		}
		if (hasBackup) await rm(backupDirectory, { recursive: true })
	} catch (error) {
		await rm(stagingDirectory, { recursive: true, force: true })
		throw error
	}
}
