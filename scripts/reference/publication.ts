import { readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { coreRulesConventions, tournamentRulesConventions } from '@/lib/rules/document-family-conventions'
import { normalizeRulesDate } from '../rules-date.ts'
import type { ExtractedCoreRulesFamily, ExtractedTournamentRulesFamily } from '../rules-document-family.ts'

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
type VersionPair = { from: string; to: string }
type TemplateFile = (typeof TEMPLATE_FILES)[number]

type ReferenceTemplates = Record<TemplateFile, string>
type PlannedReferenceArtifact = Readonly<{
	path: string
	template: TemplateFile
	values: Readonly<Record<string, string>>
}>
type PlannedOverviewTile = Readonly<{
	route: string
	title: string
	description: string
}>
type ReferenceFamilyPlan = Readonly<{
	versions: readonly string[]
	currentVersion: string
	currentVersionRoute: string
	currentNavigationPath: string
	archiveTiles: readonly PlannedOverviewTile[]
	changeTiles: readonly PlannedOverviewTile[]
	archiveNavigationPages: readonly string[]
	changeNavigationPages: readonly string[]
	artifacts: readonly PlannedReferenceArtifact[]
}>

export type ReferencePublicationInput = Readonly<{
	projectDirectory: string
	coreRules: ExtractedCoreRulesFamily
	tournamentRules: ExtractedTournamentRulesFamily
}>

export type PreparedReferencePublication = Readonly<{
	artifacts: ReadonlyMap<string, string>
	summary: Readonly<{ pages: number }>
}>

export type ReferencePublicationStage = 'history' | 'templates' | 'render' | 'artifacts'

export class ReferencePublicationError extends Error {
	declare readonly cause: unknown

	constructor(
		readonly stage: ReferencePublicationStage,
		message: string,
		cause: unknown,
	) {
		super(message, { cause })
		this.name = 'ReferencePublicationError'
		this.cause = cause
	}
}

function publicationError(stage: ReferencePublicationStage, message: string, cause: unknown) {
	const detail = cause instanceof Error ? `: ${cause.message}` : ''
	return new ReferencePublicationError(stage, `${message}${detail}`, cause)
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

function validateHistory<Version extends { registeredVersion: { version: string }; lastUpdated: unknown }>(
	label: string,
	versions: readonly [Version, ...Version[]],
	currentVersion: Version,
	conventions: {
		compareVersions(left: string, right: string): number
		version(version: string): unknown
	},
) {
	if (versions.length === 0) throw new Error(`${label} has no registered versions`)
	let previousVersion: string | undefined
	const dates = new Map<string, string>()
	for (const { registeredVersion, lastUpdated } of versions) {
		const { version } = registeredVersion
		conventions.version(version)
		dates.set(version, normalizeRulesDate(lastUpdated, `${label} ${version} Last Updated`))
		if (previousVersion && conventions.compareVersions(previousVersion, version) >= 0) {
			throw new Error(`${label} registered versions are not in strictly increasing order`)
		}
		previousVersion = version
	}
	const greatestVersion = versions.at(-1)!.registeredVersion.version
	if (currentVersion.registeredVersion.version !== greatestVersion) {
		throw new Error(`${label} current version ${currentVersion.registeredVersion.version} is not greatest`)
	}
	return dates
}

function planCoreRulesReference(family: ExtractedCoreRulesFamily): ReferenceFamilyPlan {
	const dates = validateHistory('Core Rules', family.versions, family.currentVersion, coreRulesConventions)
	const versions = family.versions.map(({ registeredVersion }) => registeredVersion.version)
	const currentVersion = family.currentVersion.registeredVersion.version
	const archivedVersions = versions.slice(0, -1)
	const changes = adjacentVersionPairs(versions)
	const metadata: Record<string, CoreVersionMetadata> = Object.fromEntries(
		family.versions.map(({ registeredVersion: { version, name } }) => [version, { name }]),
	)
	const currentConventions = coreRulesConventions.version(currentVersion)
	return {
		versions,
		currentVersion,
		currentVersionRoute: currentConventions.reference.documentRoute,
		currentNavigationPath: currentConventions.reference.currentDocumentPath.replace(/\.mdx$/u, ''),
		archiveTiles: archivedVersions.toReversed().map((version) => ({
			route: coreRulesConventions.version(version).reference.documentRoute,
			title: coreSidebarTitle(version, metadata[version].name),
			description: `Archived Core Rules version ${version}.`,
		})),
		changeTiles: changes.toReversed().map(({ from, to }) => ({
			route: coreRulesConventions.version(to).reference.changeRoute,
			title: coreChangeSidebarTitle(to, metadata[to].name),
			description: `Changes from Core Rules ${from} to ${to}.`,
		})),
		archiveNavigationPages: archivedVersions.toReversed(),
		changeNavigationPages: changes.toReversed().map(({ to }) => to),
		artifacts: [
			{
				path: currentConventions.reference.currentDocumentPath,
				template: 'core-rules-current.mdx',
				values: {
					CREATED_AT: dates.get(currentVersion)!,
					TITLE: coreTitle(currentVersion, metadata[currentVersion].name),
					VERSION: currentVersion,
				},
			},
			...archivedVersions.map((version): PlannedReferenceArtifact => {
				const name = metadata[version].name
				return {
					path: coreRulesConventions.version(version).reference.archivedDocumentPath,
					template: 'core-rules-archive.mdx',
					values: {
						CREATED_AT: dates.get(version)!,
						CURRENT_VERSION_ROUTE: currentConventions.reference.documentRoute,
						DESCRIPTION: `Archived snapshot of the Riftbound Core Rules Document as of version ${coreVersionLabel(version, name)}.`,
						SIDEBAR_TITLE: coreSidebarTitle(version, name),
						TITLE: coreTitle(version, name),
						VERSION: version,
					},
				}
			}),
			...changes.map(({ from, to }): PlannedReferenceArtifact => ({
				path: coreRulesConventions.version(to).reference.changePath,
				template: 'core-rules-change.mdx',
				values: {
					CREATED_AT: dates.get(to)!,
					DESCRIPTION: `Changes between Riftbound Core Rules ${coreVersionLabel(from, metadata[from].name)} and ${coreVersionLabel(to, metadata[to].name)}.`,
					FROM: from,
					SIDEBAR_TITLE: coreChangeSidebarTitle(to, metadata[to].name),
					TITLE: coreChangeTitle(to, metadata[to].name),
					TO: to,
				},
			})),
		],
	}
}

function planTournamentRulesReference(family: ExtractedTournamentRulesFamily): ReferenceFamilyPlan {
	const dates = validateHistory(
		'Tournament Rules',
		family.versions,
		family.currentVersion,
		tournamentRulesConventions,
	)
	const versions = family.versions.map(({ registeredVersion }) => registeredVersion.version)
	const currentVersion = family.currentVersion.registeredVersion.version
	const archivedVersions = versions.slice(0, -1)
	const changes = adjacentVersionPairs(versions)
	const currentConventions = tournamentRulesConventions.version(currentVersion)
	return {
		versions,
		currentVersion,
		currentVersionRoute: currentConventions.reference.documentRoute,
		currentNavigationPath: currentConventions.reference.currentDocumentPath.replace(/\.mdx$/u, ''),
		archiveTiles: archivedVersions.toReversed().map((version) => ({
			route: tournamentRulesConventions.version(version).reference.documentRoute,
			title: `${formatMonthYear(version)} Tournament Rules`,
			description: `Archived Tournament Rules dated ${formatDate(version)}.`,
		})),
		changeTiles: changes.toReversed().map(({ from, to }) => ({
			route: tournamentRulesConventions.version(to).reference.changeRoute,
			title: `${formatMonthYear(to)} Changes`,
			description: `Changes from ${formatDateRange(from, to)}.`,
		})),
		archiveNavigationPages: archivedVersions.toReversed(),
		changeNavigationPages: changes.toReversed().map(({ to }) => to),
		artifacts: [
			{
				path: currentConventions.reference.currentDocumentPath,
				template: 'tournament-rules-current.mdx',
				values: {
					CREATED_AT: dates.get(currentVersion)!,
					TITLE: `Tournament Rules (${formatDate(currentVersion)})`,
					VERSION: currentVersion,
				},
			},
			...archivedVersions.map((version): PlannedReferenceArtifact => ({
				path: tournamentRulesConventions.version(version).reference.archivedDocumentPath,
				template: 'tournament-rules-archive.mdx',
				values: {
					CREATED_AT: dates.get(version)!,
					CURRENT_VERSION_ROUTE: currentConventions.reference.documentRoute,
					DESCRIPTION: `Archived snapshot of the Riftbound Tournament Rules last updated ${formatDate(version)}.`,
					SIDEBAR_TITLE: `${formatMonthYear(version)} Tournament Rules`,
					TITLE: `Tournament Rules (${formatDate(version)})`,
					VERSION: version,
				},
			})),
			...changes.map(({ from, to }): PlannedReferenceArtifact => ({
				path: tournamentRulesConventions.version(to).reference.changePath,
				template: 'tournament-rules-change.mdx',
				values: {
					CREATED_AT: dates.get(to)!,
					DESCRIPTION: `Changes between the ${formatMonthYear(from)} and ${formatMonthYear(to)} Riftbound Tournament Rules.`,
					FROM: from,
					SIDEBAR_TITLE: `${formatMonthYear(to)} Changes`,
					TITLE: `Tournament Rules Changes (${formatDate(to)})`,
					TO: to,
				},
			})),
		],
	}
}

async function loadReferenceTemplates(templatesDirectory: string): Promise<ReferenceTemplates> {
	return Object.fromEntries(
		await Promise.all(
			TEMPLATE_FILES.map(async (filename) => [
				filename,
				await readFile(join(templatesDirectory, filename), 'utf8'),
			]),
		),
	) as ReferenceTemplates
}

function renderOverviewTiles(tiles: readonly PlannedOverviewTile[]): string {
	return tiles
		.map(
			({ route, title, description }) =>
				`\t<Tile href="${route}" title="${title}">\n\t\t${description}\n\t</Tile>`,
		)
		.join('\n')
}

function metadataPages(pages: readonly string[]): string {
	return pages.map((page) => `\t\t${JSON.stringify(page)}`).join(',\n')
}

function navigationPages(currentCorePath: string, currentTournamentPath: string): string {
	return metadataPages([
		'---Introduction---',
		'index',
		'---Current Documents---',
		currentCorePath,
		currentTournamentPath,
		'---Core Rules---',
		'core-rules/changes',
		'core-rules/(archive)',
		'---Tournament Rules---',
		'tournament-rules/changes',
		'tournament-rules/(archive)',
	])
}

function renderReferencePublication(
	coreRules: ReferenceFamilyPlan,
	tournamentRules: ReferenceFamilyPlan,
	templates: ReferenceTemplates,
): PreparedReferencePublication {
	const artifacts = new Map<string, string>([
		[
			'index.mdx',
			renderTemplate(
				templates['index.mdx'],
				{
					CORE_RULES_ARCHIVE: renderOverviewTiles(coreRules.archiveTiles),
					CORE_RULES_CHANGES: renderOverviewTiles(coreRules.changeTiles),
					CORE_RULES_CURRENT_VERSION_ROUTE: coreRules.currentVersionRoute,
					TOURNAMENT_RULES_ARCHIVE: renderOverviewTiles(tournamentRules.archiveTiles),
					TOURNAMENT_RULES_CHANGES: renderOverviewTiles(tournamentRules.changeTiles),
					TOURNAMENT_RULES_CURRENT_VERSION_ROUTE: tournamentRules.currentVersionRoute,
				},
				'index.mdx',
			),
		],
		[
			'meta.json',
			renderTemplate(
				templates['meta.json.template'],
				{
					PAGES: navigationPages(coreRules.currentNavigationPath, tournamentRules.currentNavigationPath),
				},
				'meta.json.template',
			),
		],
		[
			'core-rules/changes/meta.json',
			renderTemplate(
				templates['group-meta.json.template'],
				{
					PAGES: metadataPages(coreRules.changeNavigationPages),
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
					PAGES: metadataPages(coreRules.archiveNavigationPages),
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
					PAGES: metadataPages(tournamentRules.changeNavigationPages),
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
					PAGES: metadataPages(tournamentRules.archiveNavigationPages),
					TITLE: 'Archive',
				},
				'group-meta.json.template',
			),
		],
	])

	for (const { path, template, values } of [...coreRules.artifacts, ...tournamentRules.artifacts]) {
		artifacts.set(path, renderTemplate(templates[template], values, template))
	}

	const pageCount = [...artifacts.keys()].filter((path) => path.endsWith('.mdx')).length
	return { artifacts, summary: { pages: pageCount } }
}

function expectedArtifactPaths(
	coreRules: ReferenceFamilyPlan,
	tournamentRules: ReferenceFamilyPlan,
): string[] {
	return [
		'index.mdx',
		'meta.json',
		'core-rules/changes/meta.json',
		'core-rules/(archive)/meta.json',
		'tournament-rules/changes/meta.json',
		'tournament-rules/(archive)/meta.json',
		...coreRules.artifacts.map(({ path }) => path),
		...tournamentRules.artifacts.map(({ path }) => path),
	]
}

function validateArtifacts(
	prepared: PreparedReferencePublication,
	coreRules: ReferenceFamilyPlan,
	tournamentRules: ReferenceFamilyPlan,
) {
	const expectedPaths = expectedArtifactPaths(coreRules, tournamentRules)
	const expectedPathSet = new Set(expectedPaths)
	const expectedCount = 2 * coreRules.versions.length + 2 * tournamentRules.versions.length + 4
	if (expectedPaths.length !== expectedCount || expectedPathSet.size !== expectedCount) {
		throw new Error('Reference publication contains colliding artifact paths')
	}
	if (prepared.artifacts.size !== expectedCount) {
		throw new Error(
			`Reference publication produced ${prepared.artifacts.size} artifacts; expected ${expectedCount}`,
		)
	}
	for (const path of prepared.artifacts.keys()) {
		if (
			!path ||
			path.includes('\\') ||
			isAbsolute(path) ||
			path.split('/').some((segment) => !segment || segment === '.' || segment === '..')
		) {
			throw new Error(`Unsafe reference artifact path ${JSON.stringify(path)}`)
		}
		if (!expectedPathSet.has(path)) throw new Error(`Unexpected reference artifact path ${path}`)
	}
	const expectedPages = 2 * coreRules.versions.length + 2 * tournamentRules.versions.length - 1
	if (prepared.summary.pages !== expectedPages) {
		throw new Error(
			`Reference publication counted ${prepared.summary.pages} pages; expected ${expectedPages}`,
		)
	}
}

export async function prepareReferencePublication({
	projectDirectory,
	coreRules,
	tournamentRules,
}: ReferencePublicationInput): Promise<PreparedReferencePublication> {
	if (!isAbsolute(projectDirectory)) {
		throw new ReferencePublicationError(
			'history',
			'Reference publication requires an absolute project directory',
			undefined,
		)
	}

	let coreRulesPlan: ReferenceFamilyPlan
	let tournamentRulesPlan: ReferenceFamilyPlan
	try {
		coreRulesPlan = planCoreRulesReference(coreRules)
		tournamentRulesPlan = planTournamentRulesReference(tournamentRules)
	} catch (cause) {
		throw publicationError('history', 'Reference publication history is invalid', cause)
	}

	let templates: ReferenceTemplates
	try {
		templates = await loadReferenceTemplates(join(projectDirectory, 'templates', 'reference'))
	} catch (cause) {
		throw publicationError('templates', 'Reference publication templates could not be loaded', cause)
	}

	let prepared: PreparedReferencePublication
	try {
		prepared = renderReferencePublication(coreRulesPlan, tournamentRulesPlan, templates)
	} catch (cause) {
		throw publicationError('render', 'Reference publication could not be rendered', cause)
	}

	try {
		validateArtifacts(prepared, coreRulesPlan, tournamentRulesPlan)
	} catch (cause) {
		throw publicationError('artifacts', 'Reference publication artifacts are invalid', cause)
	}
	return prepared
}
