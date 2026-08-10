import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { normalizeRulesDate } from '../rules-date.ts'
import type {
	RegisteredCoreRulesVersion,
	RegisteredTournamentRulesVersion,
	RulesManifest,
} from '../rules-manifest.ts'

const PROJECT_DIRECTORY = join(import.meta.dirname, '..', '..')
const DEFAULT_TEMPLATES_DIRECTORY = join(PROJECT_DIRECTORY, 'templates', 'reference')
const PLACEHOLDER = /\{\{([A-Z_]+)\}\}/gu

const TEMPLATE_FILES = [
	'index.mdx',
	'meta.json.template',
	'group-meta.json.template',
	'core-rules-current.mdx',
	'core-rules-archive.mdx',
	'core-rules-change.mdx',
	'tournament-rules-current.mdx',
	'tournament-rules-archive.mdx',
	'tournament-rules-change.mdx',
] as const

type CoreVersionMetadata = { name?: string }
type ReferenceVersion<RegisteredVersion> = Readonly<{
	registeredVersion: RegisteredVersion
	lastUpdated: string
}>
type VersionPair = { from: string; to: string }
type TemplateFile = (typeof TEMPLATE_FILES)[number]

export type ReferencePreparationInputs = {
	coreRules: readonly [
		ReferenceVersion<RegisteredCoreRulesVersion>,
		...ReferenceVersion<RegisteredCoreRulesVersion>[],
	]
	tournamentRules: readonly [
		ReferenceVersion<RegisteredTournamentRulesVersion>,
		...ReferenceVersion<RegisteredTournamentRulesVersion>[],
	]
	templatesDirectory?: string
}

export type PreparedReferencePages = {
	artifacts: Map<string, string>
	summary: { pages: number }
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

function coreSidebarTitle(version: string, name?: string): string {
	return name ? `${name} Core Rules` : `Core Rules ${version}`
}

function coreVersionLabel(version: string, name?: string): string {
	return `${version}${name ? ` (${name})` : ''}`
}

function coreChangeSidebarTitle(version: string, name?: string): string {
	return name ? `${name} Changes` : `Core Rules ${version} Changes`
}

function coreTitle(version: string, name?: string): string {
	return `Core Rules ${coreVersionLabel(version, name)}`
}

function coreChangeTitle(version: string, name?: string): string {
	return `Core Rules ${version} Changes${name ? ` (${name})` : ''}`
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

function referenceDates<Version extends { registeredVersion: { version: string }; lastUpdated: unknown }>(
	versionsWithDates: readonly Version[],
	family: string,
	versions: readonly string[],
): Map<string, string> {
	const dates = new Map(
		versionsWithDates.map(({ registeredVersion, lastUpdated }) => [
			registeredVersion.version,
			normalizeRulesDate(lastUpdated, `${family} ${registeredVersion.version} Last Updated`),
		]),
	)
	for (const version of versions) {
		if (!dates.has(version)) throw new Error(`${family} ${version}: missing parsed Last Updated date`)
	}
	return dates
}

function coreChangeTiles(
	changes: readonly VersionPair[],
	metadata: Record<string, CoreVersionMetadata>,
): string {
	return changes
		.toReversed()
		.map(({ from, to }) => {
			const name = metadata[to].name
			return `\t<Tile href="/reference/core-rules/changes/${to}" title="${coreChangeSidebarTitle(to, name)}">\n\t\tChanges from Core Rules ${from} to ${to}.\n\t</Tile>`
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
				`\t<Tile href="/reference/core-rules/${version}" title="${coreSidebarTitle(version, metadata[version].name)}">\n\t\tArchived Core Rules version ${version}.\n\t</Tile>`,
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

function metadataPages(pages: readonly string[]): string {
	return pages.map((page) => `\t\t${JSON.stringify(page)}`).join(',\n')
}

function navigationPages(currentCoreVersion: string, currentTournamentVersion: string): string {
	return metadataPages([
		'---Introduction---',
		'index',
		'---Current Documents---',
		`core-rules/${currentCoreVersion}`,
		`tournament-rules/${currentTournamentVersion}`,
		'---Core Rules---',
		'core-rules/changes',
		'core-rules/(archive)',
		'---Tournament Rules---',
		'tournament-rules/changes',
		'tournament-rules/(archive)',
	])
}

export async function prepareReferencePages(
	manifest: RulesManifest,
	{
		coreRules,
		tournamentRules,
		templatesDirectory = DEFAULT_TEMPLATES_DIRECTORY,
	}: ReferencePreparationInputs,
): Promise<PreparedReferencePages> {
	const coreMetadata: Record<string, CoreVersionMetadata> = Object.fromEntries(
		manifest.coreRules.registeredVersions.map(({ version, name }) => [version, { name }]),
	)
	const coreVersions = manifest.coreRules.registeredVersions.map(({ version }) => version)
	const tournamentVersions = manifest.tournamentRules.registeredVersions.map(({ version }) => version)
	const currentCoreVersion = manifest.coreRules.currentVersion.version
	const currentTournamentVersion = manifest.tournamentRules.currentVersion.version
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
					CORE_RULES_CURRENT_VERSION: currentCoreVersion,
					TOURNAMENT_RULES_ARCHIVE: tournamentArchiveTiles(tournamentArchivedVersions),
					TOURNAMENT_RULES_CHANGES: tournamentChangeTiles(tournamentChanges),
					TOURNAMENT_RULES_CURRENT_VERSION: currentTournamentVersion,
				},
				'index.mdx',
			),
		],
		[
			'meta.json',
			renderTemplate(
				templates['meta.json.template'],
				{
					PAGES: navigationPages(currentCoreVersion, currentTournamentVersion),
				},
				'meta.json.template',
			),
		],
		[
			'core-rules/changes/meta.json',
			renderTemplate(
				templates['group-meta.json.template'],
				{
					PAGES: metadataPages(coreChanges.toReversed().map(({ to }) => to)),
					TITLE: 'Changes',
				},
				'group-meta.json.template',
			),
		],
		[
			'core-rules/(archive)/meta.json',
			renderTemplate(
				templates['group-meta.json.template'],
				{
					PAGES: metadataPages(coreArchivedVersions.toReversed()),
					TITLE: 'Archive',
				},
				'group-meta.json.template',
			),
		],
		[
			'tournament-rules/changes/meta.json',
			renderTemplate(
				templates['group-meta.json.template'],
				{
					PAGES: metadataPages(tournamentChanges.toReversed().map(({ to }) => to)),
					TITLE: 'Changes',
				},
				'group-meta.json.template',
			),
		],
		[
			'tournament-rules/(archive)/meta.json',
			renderTemplate(
				templates['group-meta.json.template'],
				{
					PAGES: metadataPages(tournamentArchivedVersions.toReversed()),
					TITLE: 'Archive',
				},
				'group-meta.json.template',
			),
		],
		[
			`core-rules/${currentCoreVersion}.mdx`,
			renderTemplate(
				templates['core-rules-current.mdx'],
				{
					CREATED_AT: coreDates.get(currentCoreVersion)!,
					TITLE: coreTitle(currentCoreVersion, coreMetadata[currentCoreVersion].name),
					VERSION: currentCoreVersion,
				},
				'core-rules-current.mdx',
			),
		],
		[
			`tournament-rules/${currentTournamentVersion}.mdx`,
			renderTemplate(
				templates['tournament-rules-current.mdx'],
				{
					CREATED_AT: tournamentDates.get(currentTournamentVersion)!,
					TITLE: `Tournament Rules (${formatDate(currentTournamentVersion)})`,
					VERSION: currentTournamentVersion,
				},
				'tournament-rules-current.mdx',
			),
		],
	])

	for (const version of coreArchivedVersions) {
		const name = coreMetadata[version].name
		artifacts.set(
			`core-rules/(archive)/${version}.mdx`,
			renderTemplate(
				templates['core-rules-archive.mdx'],
				{
					CREATED_AT: coreDates.get(version)!,
					CURRENT_VERSION: currentCoreVersion,
					DESCRIPTION: `Archived snapshot of the Riftbound Core Rules Document as of version ${coreVersionLabel(version, name)}.`,
					SIDEBAR_TITLE: coreSidebarTitle(version, name),
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
					SIDEBAR_TITLE: coreChangeSidebarTitle(to, coreMetadata[to].name),
					TITLE: coreChangeTitle(to, coreMetadata[to].name),
					TO: to,
				},
				'core-rules-change.mdx',
			),
		)
	}
	for (const version of tournamentArchivedVersions) {
		artifacts.set(
			`tournament-rules/(archive)/${version}.mdx`,
			renderTemplate(
				templates['tournament-rules-archive.mdx'],
				{
					CREATED_AT: tournamentDates.get(version)!,
					CURRENT_VERSION: currentTournamentVersion,
					DESCRIPTION: `Archived snapshot of the Riftbound Tournament Rules last updated ${formatDate(version)}.`,
					SIDEBAR_TITLE: `${formatMonthYear(version)} Tournament Rules`,
					TITLE: `Tournament Rules (${formatDate(version)})`,
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
					SIDEBAR_TITLE: `${formatMonthYear(to)} Changes`,
					TITLE: `Tournament Rules Changes (${formatDate(to)})`,
					TO: to,
				},
				'tournament-rules-change.mdx',
			),
		)
	}

	const pageCount = [...artifacts.keys()].filter((path) => path.endsWith('.mdx')).length
	return { artifacts, summary: { pages: pageCount } }
}
