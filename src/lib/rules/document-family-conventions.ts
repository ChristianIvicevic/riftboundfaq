import {
	RULES_DOCUMENT_FAMILY_IDENTITIES,
	type RulesDocumentFamilyId,
} from '@/lib/rules/document-family-identity'
import { InvalidRulesVersionError } from '@/lib/rules/invalid-rules-version-error'
import { UnknownRulesDocumentFamilyError } from '@/lib/rules/unknown-rules-document-family-error'

export { InvalidRulesVersionError, UnknownRulesDocumentFamilyError }
export type { RulesDocumentFamilyId }

declare const rulesVersionBrand: unique symbol

export type RulesVersion<Family extends RulesDocumentFamilyId> = string & {
	readonly [rulesVersionBrand]: Family
}

export type RulesDocumentVersionConventions<Family extends RulesDocumentFamilyId> = Readonly<{
	family: Family
	version: RulesVersion<Family>
	source: Readonly<{
		pdfFilename: string
		transcriptFilename: string
	}>
	generated: Readonly<{
		filename: string
		moduleSpecifier: string
		exportName: string
	}>
	reference: Readonly<{
		currentDocumentPath: string
		archivedDocumentPath: string
		changePath: string
		documentRoute: string
		changeRoute: string
	}>
}>

export type RulesDocumentFamilyConventions<Family extends RulesDocumentFamilyId> = Readonly<{
	id: Family
	label: string
	generated: Readonly<{
		directory: string
		indexModuleSpecifier: string
		currentVersionExport: string
		documentsExport: string
		versionNamesExport: string | null
	}>
	isVersion(input: string): input is RulesVersion<Family>
	version(input: string): RulesDocumentVersionConventions<Family>
	compareVersions(left: string, right: string): -1 | 0 | 1
}>

type AnyRulesDocumentFamilyConventions =
	| RulesDocumentFamilyConventions<'core-rules'>
	| RulesDocumentFamilyConventions<'tournament-rules'>

export type RecognizedRulesSource =
	| Readonly<{
			kind: 'pdf' | 'transcript'
			family: 'core-rules'
			version: RulesVersion<'core-rules'>
	  }>
	| Readonly<{
			kind: 'pdf' | 'transcript'
			family: 'tournament-rules'
			version: RulesVersion<'tournament-rules'>
	  }>

const CORE_RULES_VERSION = /^1\.(0|[1-9]\d*)$/u
const TOURNAMENT_RULES_VERSION = /^\d{4}-\d{2}-\d{2}$/u

function isCoreRulesVersion(input: string): input is RulesVersion<'core-rules'> {
	return CORE_RULES_VERSION.test(input)
}

function coreRulesVersion(input: string): RulesDocumentVersionConventions<'core-rules'> {
	if (!isCoreRulesVersion(input)) throw new InvalidRulesVersionError('core-rules', input)

	return Object.freeze({
		family: 'core-rules',
		version: input,
		source: Object.freeze({
			pdfFilename: `CR-v${input}.pdf`,
			transcriptFilename: `CR-v${input}.txt`,
		}),
		generated: Object.freeze({
			filename: `v${input.replace('.', '-')}.ts`,
			moduleSpecifier: `@/generated/core-rules/v${input.replace('.', '-')}`,
			exportName: `PDF_CORE_RULES_${input.replace('.', '_')}`,
		}),
		reference: Object.freeze({
			currentDocumentPath: `core-rules/${input}.mdx`,
			archivedDocumentPath: `core-rules/(archive)/${input}.mdx`,
			changePath: `core-rules/changes/${input}.mdx`,
			documentRoute: `/reference/core-rules/${input}`,
			changeRoute: `/reference/core-rules/changes/${input}`,
		}),
	})
}

export const coreRulesConventions: RulesDocumentFamilyConventions<'core-rules'> = Object.freeze({
	id: 'core-rules',
	label: RULES_DOCUMENT_FAMILY_IDENTITIES['core-rules'].label,
	generated: Object.freeze({
		directory: 'core-rules',
		indexModuleSpecifier: '@/generated/core-rules',
		currentVersionExport: 'CURRENT_PDF_CORE_RULES_VERSION',
		documentsExport: 'PDF_CORE_RULES_VERSIONS',
		versionNamesExport: 'PDF_CORE_RULES_VERSION_NAMES',
	}),
	isVersion: isCoreRulesVersion,
	version: coreRulesVersion,
	compareVersions(left, right) {
		const leftVersion = coreRulesVersion(left).version
		const rightVersion = coreRulesVersion(right).version
		const leftMinor = BigInt(leftVersion.slice(2))
		const rightMinor = BigInt(rightVersion.slice(2))
		return leftMinor < rightMinor ? -1 : leftMinor > rightMinor ? 1 : 0
	},
})

function isTournamentRulesVersion(input: string): input is RulesVersion<'tournament-rules'> {
	if (!TOURNAMENT_RULES_VERSION.test(input)) return false
	const date = new Date(`${input}T00:00:00.000Z`)
	return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === input
}

function tournamentRulesVersion(input: string): RulesDocumentVersionConventions<'tournament-rules'> {
	if (!isTournamentRulesVersion(input)) {
		throw new InvalidRulesVersionError('tournament-rules', input)
	}

	return Object.freeze({
		family: 'tournament-rules',
		version: input,
		source: Object.freeze({
			pdfFilename: `Tournament-Rules-${input}.pdf`,
			transcriptFilename: `Tournament-Rules-${input}.txt`,
		}),
		generated: Object.freeze({
			filename: `v${input}.ts`,
			moduleSpecifier: `@/generated/tournament-rules/v${input}`,
			exportName: `PDF_TOURNAMENT_RULES_${input.replaceAll('-', '_')}`,
		}),
		reference: Object.freeze({
			currentDocumentPath: `tournament-rules/${input}.mdx`,
			archivedDocumentPath: `tournament-rules/(archive)/${input}.mdx`,
			changePath: `tournament-rules/changes/${input}.mdx`,
			documentRoute: `/reference/tournament-rules/${input}`,
			changeRoute: `/reference/tournament-rules/changes/${input}`,
		}),
	})
}

export const tournamentRulesConventions: RulesDocumentFamilyConventions<'tournament-rules'> = Object.freeze({
	id: 'tournament-rules',
	label: RULES_DOCUMENT_FAMILY_IDENTITIES['tournament-rules'].label,
	generated: Object.freeze({
		directory: 'tournament-rules',
		indexModuleSpecifier: '@/generated/tournament-rules',
		currentVersionExport: 'CURRENT_PDF_TOURNAMENT_RULES_VERSION',
		documentsExport: 'PDF_TOURNAMENT_RULES_DOCUMENTS',
		versionNamesExport: null,
	}),
	isVersion: isTournamentRulesVersion,
	version: tournamentRulesVersion,
	compareVersions(left, right) {
		const leftVersion = tournamentRulesVersion(left).version
		const rightVersion = tournamentRulesVersion(right).version
		return leftVersion < rightVersion ? -1 : leftVersion > rightVersion ? 1 : 0
	},
})

export function rulesDocumentFamily(id: 'core-rules'): RulesDocumentFamilyConventions<'core-rules'>
export function rulesDocumentFamily(
	id: 'tournament-rules',
): RulesDocumentFamilyConventions<'tournament-rules'>
export function rulesDocumentFamily(id: string): AnyRulesDocumentFamilyConventions
export function rulesDocumentFamily(id: string): AnyRulesDocumentFamilyConventions {
	if (id === 'core-rules') return coreRulesConventions
	if (id === 'tournament-rules') return tournamentRulesConventions
	throw new UnknownRulesDocumentFamilyError(id)
}

export function recognizeRulesSourceFilename(filename: string): RecognizedRulesSource | undefined {
	const coreMatch = filename.match(/^CR-v(.+)\.(pdf|txt)$/u)
	if (coreMatch && coreRulesConventions.isVersion(coreMatch[1])) {
		const version = coreRulesConventions.version(coreMatch[1])
		const kind = coreMatch[2] === 'pdf' ? 'pdf' : 'transcript'
		const expected = kind === 'pdf' ? version.source.pdfFilename : version.source.transcriptFilename
		if (filename === expected) {
			return Object.freeze({ kind, family: 'core-rules', version: version.version })
		}
	}

	const tournamentMatch = filename.match(/^Tournament-Rules-(.+)\.(pdf|txt)$/u)
	if (tournamentMatch && tournamentRulesConventions.isVersion(tournamentMatch[1])) {
		const version = tournamentRulesConventions.version(tournamentMatch[1])
		const kind = tournamentMatch[2] === 'pdf' ? 'pdf' : 'transcript'
		const expected = kind === 'pdf' ? version.source.pdfFilename : version.source.transcriptFilename
		if (filename === expected) {
			return Object.freeze({ kind, family: 'tournament-rules', version: version.version })
		}
	}
}
