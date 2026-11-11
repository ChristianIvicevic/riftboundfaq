import { Data, Effect, Result } from 'effect'
import * as ByteSize from 'effect/ByteSize'
import * as FileSystem from 'effect/FileSystem'
import * as Path from 'effect/Path'
import { tournamentRulesConventions } from '@/lib/rules/document-family-conventions'
import type { TournamentRulesDocument, TournamentRulesSection } from '@/lib/rules/tournament-rules-document'
import { normalizeRulesDate } from '../date'
import { reconstructPhysicalLines } from '../lines'
import type { RegisteredTournamentRulesVersion } from '../manifest'
import { RulesPdf } from '../pdf'
import { inspectDrawings } from './drawings'
import {
	appendTournamentRulesSourcePage,
	createTournamentRulesSourceRowsAccumulator,
	finishTournamentRulesSourceRows,
	type TournamentRulesForensicRow,
	type TournamentRulesSourceEntry,
} from './source-rows'
import { structureTournamentRulesEntries, type TournamentStructureDiagnostic } from './structure'

const FORENSIC_PDF_FILENAME = /^Tournament-Rules-(\d{4}-\d{2}-\d{2})\.pdf$/u
const TITLE = 'Riftbound Tournament Rules'

function compareIds(left: string, right: string): number {
	const leftParts = left.split('.')
	const rightParts = right.split('.')
	for (let index = 0; index < Math.min(leftParts.length, rightParts.length); index++) {
		const leftPart = leftParts[index]
		const rightPart = rightParts[index]
		const difference =
			/^\d+$/u.test(leftPart) && /^\d+$/u.test(rightPart)
				? Number(leftPart) - Number(rightPart)
				: leftPart.localeCompare(rightPart, 'en')
		if (difference !== 0) return difference
	}
	return leftParts.length - rightParts.length
}

function normalizeDocumentDate(value: string): string {
	const numericDate = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u)
	if (!numericDate) return value
	return `${numericDate[3]}-${numericDate[1].padStart(2, '0')}-${numericDate[2].padStart(2, '0')}`
}

type DuplicateIdEntry = {
	sequence: number
	page: number
	active: boolean
	rawLabel: string
}

function duplicateIds(rows: readonly TournamentRulesForensicRow[]): Record<string, DuplicateIdEntry[]> {
	const occurrences = new Map<string, DuplicateIdEntry[]>()
	for (const row of rows) {
		if (!row.id) continue
		const existing = occurrences.get(row.id) ?? []
		existing.push({ sequence: row.sequence, page: row.page, active: row.active, rawLabel: row.rawLabel })
		occurrences.set(row.id, existing)
	}
	return Object.fromEntries([...occurrences].filter(([, entries]) => entries.length > 1))
}

export type TournamentRulesSource = Readonly<{
	file: string
	version: string | null
	title: string
	lastUpdated: string
	entries: readonly TournamentRulesSourceEntry[]
}>

const readTournamentPdf = Effect.fnUntraced(function* (path: string) {
	const fileSystem = yield* FileSystem.FileSystem
	const pathService = yield* Path.Path
	const pdf = yield* RulesPdf
	const absolutePath = pathService.resolve(path)
	const filename = pathService.basename(absolutePath)
	const version = filename.match(FORENSIC_PDF_FILENAME)?.[1] ?? null
	const data = new Uint8Array(yield* fileSystem.readFile(absolutePath))
	return yield* pdf.withDocument({ path: absolutePath, data }, (document) =>
		Effect.gen(function* () {
			let physicalLineCount = 0
			let title = ''
			let lastUpdated = ''
			let accumulator = createTournamentRulesSourceRowsAccumulator()
			for (let pageNumber = 1; pageNumber <= document.pageCount; pageNumber++) {
				const page = yield* document.extractTextAndOperatorsPage(pageNumber)
				const physicalLines = reconstructPhysicalLines(page.items, pageNumber)
				const textItems = physicalLines.flatMap((line) => line.items)
				physicalLineCount += physicalLines.length
				if (pageNumber === 1) {
					title = physicalLines.find((line) => /Tournament Rules/iu.test(line.text))?.text ?? ''
					lastUpdated = normalizeDocumentDate(
						physicalLines
							.find((line) => /Last Updated:?/iu.test(line.text))
							?.text.match(/Last Updated:?\s*(.+)$/iu)?.[1]
							?.trim() ?? '',
					)
				}
				accumulator = yield* Effect.fromResult(
					appendTournamentRulesSourcePage(accumulator, {
						page: pageNumber,
						items: textItems,
						drawings: inspectDrawings(page.operators),
					}),
				)
			}
			return {
				absolutePath,
				filename,
				version,
				pageCount: document.pageCount,
				physicalLineCount,
				title,
				lastUpdated,
				reconstruction: finishTournamentRulesSourceRows(accumulator),
			}
		}),
	)
})

export const inspectTournamentPdf = Effect.fn('inspectTournamentPdf')(function* (path: string) {
	const fileSystem = yield* FileSystem.FileSystem
	const inspected = yield* readTournamentPdf(path)
	const fileStats = yield* fileSystem.stat(inspected.absolutePath)
	const { filename, version, pageCount, physicalLineCount, title, lastUpdated, reconstruction } = inspected
	const rows = reconstruction.forensicRows
	const numberedRows = rows.filter((row) => row.id)
	const activeNumberedRows = numberedRows.filter((row) => row.active)
	const backwardsIds: { previousId: string; id: string; page: number }[] = []
	for (let index = 1; index < activeNumberedRows.length; index++) {
		const previous = activeNumberedRows[index - 1]
		const current = activeNumberedRows[index]
		if (compareIds(current.id!, previous.id!) < 0) {
			backwardsIds.push({ previousId: previous.id!, id: current.id!, page: current.page })
		}
	}
	const diagnostics = rows.flatMap((row) =>
		row.diagnostics.map((code) => ({ code, page: row.page, rawLabel: row.rawLabel, text: row.text })),
	)
	const malformedLabels = diagnostics.filter(({ code }) => code === 'malformed-label')
	const unnumberedRows = rows.filter((row) => !row.rawLabel)
	const deletedRows = rows.filter((row) => !row.active)
	const highlightedActiveRows = rows.filter((row) => row.active && row.highlighted)
	const headingCounts = {
		primary: rows.filter(({ kind }) => kind === 'primary-heading').length,
		secondary: rows.filter(({ kind }) => kind === 'secondary-heading').length,
	}

	return {
		file: filename,
		version,
		bytes: ByteSize.toNumberUnsafe(fileStats.size),
		pages: pageCount,
		title,
		lastUpdated,
		physicalLineCount,
		headingCounts,
		rowCount: rows.length,
		numberedRowCount: numberedRows.length,
		activeRowCount: rows.length - deletedRows.length,
		deletedRowCount: deletedRows.length,
		unnumberedRowCount: unnumberedRows.length,
		unnumberedRows: unnumberedRows.map(({ page, text, geometry }) => ({
			page,
			text,
			geometry: geometry.bounds,
		})),
		crossPageJoins: rows.filter(({ continuation }) => continuation).length,
		crossPageRows: rows
			.filter(({ continuation }) => continuation)
			.map(({ id, rawLabel, text, source }) => ({ id, rawLabel, text, source })),
		duplicateIds: duplicateIds(rows),
		backwardsIds,
		malformedLabels,
		missingIds: rows
			.filter((row) => row.rawLabel && !row.id)
			.map((row) => ({ page: row.page, rawLabel: row.rawLabel })),
		strikeoutRemovals: deletedRows.map(({ page, rawLabel, id, text, removedText }) => ({
			page,
			rawLabel,
			id,
			text,
			removedText,
		})),
		highlightedActiveRows: highlightedActiveRows.map(({ page, rawLabel, id, text }) => ({
			page,
			rawLabel,
			id,
			text,
		})),
		diagnostics,
		rows,
	}
})

const readTournamentRulesSource = Effect.fn('readTournamentRulesSource')(function* (path: string) {
	const { filename, version, title, lastUpdated, reconstruction } = yield* readTournamentPdf(path)
	return {
		file: filename,
		version,
		title,
		lastUpdated,
		entries: reconstruction.sourceEntries,
	} satisfies TournamentRulesSource
})

export type TournamentPdfReport = Effect.Success<ReturnType<typeof inspectTournamentPdf>>

type TournamentRulesSourceContext = Readonly<{
	family: 'tournament-rules'
	version: string
	path: string
}>

type ExtractedRulesDiagnostic = Readonly<{
	severity: 'warning'
	message: string
}>

export type ExtractedTournamentRulesVersion = Readonly<{
	registeredVersion: RegisteredTournamentRulesVersion
	lastUpdated: string
	document: TournamentRulesDocument
	transcript: string
	diagnostics: readonly ExtractedRulesDiagnostic[]
}>

export type ExtractedTournamentRulesFamily = Readonly<{
	versions: readonly [ExtractedTournamentRulesVersion, ...ExtractedTournamentRulesVersion[]]
	currentVersion: ExtractedTournamentRulesVersion
}>

export type TournamentRulesExtractionOperation = 'read-source' | 'validate-source'

export class TournamentRulesExtractionError extends Data.TaggedError('TournamentRulesExtractionError')<{
	readonly source: TournamentRulesSourceContext
	readonly operation: TournamentRulesExtractionOperation
	readonly page?: number
	readonly message: string
	readonly cause: unknown
}> {}

function validationError(
	context: TournamentRulesSourceContext,
	message: string,
	cause?: unknown,
	page?: number,
): TournamentRulesExtractionError {
	return new TournamentRulesExtractionError({
		source: context,
		operation: 'validate-source',
		page,
		message,
		cause,
	})
}

function validateSource(
	source: TournamentRulesSource,
	context: TournamentRulesSourceContext,
): Result.Result<string, TournamentRulesExtractionError> {
	return Result.gen(function* () {
		const lastUpdated = yield* normalizeRulesDate(source.lastUpdated, `${source.file}: Last Updated`).pipe(
			Result.mapError((cause) => validationError(context, cause.message, cause)),
		)
		if (source.version !== context.version) {
			return yield* Result.fail(
				validationError(context, `${source.file}: filename does not identify version ${context.version}`),
			)
		}
		if (lastUpdated !== context.version) {
			return yield* Result.fail(
				validationError(
					context,
					`${source.file}: Last Updated ${source.lastUpdated || '(missing)'} does not match ${context.version}`,
				),
			)
		}
		if (source.title !== TITLE) {
			return yield* Result.fail(
				validationError(context, `${source.file}: unexpected document title ${source.title}`),
			)
		}
		if (source.entries.length === 0) {
			return yield* Result.fail(
				validationError(context, `${source.file}: no Tournament Rules source entries found`),
			)
		}
		if (source.entries.some(({ kind, label }) => kind !== 'rule' && !label?.id)) {
			return yield* Result.fail(validationError(context, `${source.file}: heading without an ID`))
		}

		for (const entry of source.entries) {
			if (entry.activity.status === 'removed' && entry.activity.removalEvidence.coverage === 'partial') {
				return yield* Result.fail(
					validationError(
						context,
						`${source.file}: partial strikeout on page ${entry.sourcePages.start} requires manual review`,
						undefined,
						entry.sourcePages.start,
					),
				)
			}
		}
		return lastUpdated
	})
}

function runtimeDocument(
	source: TournamentRulesSource,
	sections: TournamentRulesSection[],
): TournamentRulesDocument {
	return { schemaVersion: 1, version: source.version!, sections }
}

function structureWarning(
	file: string,
	diagnostics: TournamentStructureDiagnostic[],
): ExtractedRulesDiagnostic | null {
	if (diagnostics.length === 0) return null
	const counts = new Map<TournamentStructureDiagnostic['code'], number>()
	for (const { code } of diagnostics) counts.set(code, (counts.get(code) ?? 0) + 1)
	const summary = [...counts]
		.toSorted(([left], [right]) => left.localeCompare(right))
		.map(([code, count]) => `${code}: ${count}`)
		.join(', ')
	return { severity: 'warning', message: `${file}: preserved structural anomalies (${summary})` }
}

function serializeTranscript(source: TournamentRulesSource): string {
	const lines = [source.title, `Last Updated: ${source.lastUpdated}`]
	for (const entry of source.entries.filter(({ activity }) => activity.status === 'active')) {
		lines.push(`${entry.label?.text ?? ''}${entry.text ? ` ${entry.text}` : ''}`.trim())
	}
	return `${lines.join('\n')}\n`
}

export const extractTournamentRulesVersion = Effect.fn('extractTournamentRulesVersion')(function* (
	registeredVersion: RegisteredTournamentRulesVersion,
	sourcesDirectory: string,
) {
	const pathService = yield* Path.Path
	const conventions = tournamentRulesConventions.version(registeredVersion.version)
	const context = {
		family: 'tournament-rules',
		version: registeredVersion.version,
		path: pathService.join(sourcesDirectory, conventions.source.pdfFilename),
	} as const
	const source = yield* readTournamentRulesSource(context.path).pipe(
		Effect.mapError((cause) => {
			const detail = cause instanceof Error ? `: ${cause.message}` : ''
			return new TournamentRulesExtractionError({
				source: context,
				operation: 'read-source',
				message: `${context.path}: Tournament Rules source reading failed${detail}`,
				cause,
			})
		}),
	)
	const lastUpdated = yield* Effect.fromResult(validateSource(source, context))
	let structured: ReturnType<typeof structureTournamentRulesEntries>
	try {
		structured = structureTournamentRulesEntries(source.entries)
	} catch (cause) {
		throw new Error(`${source.file}: Tournament Rules structuring failed`, { cause })
	}
	const diagnostic = structureWarning(source.file, structured.diagnostics)
	return {
		registeredVersion,
		lastUpdated,
		document: runtimeDocument(source, structured.sections),
		transcript: serializeTranscript({ ...source, lastUpdated }),
		diagnostics: diagnostic ? [diagnostic] : [],
	} satisfies ExtractedTournamentRulesVersion
})
