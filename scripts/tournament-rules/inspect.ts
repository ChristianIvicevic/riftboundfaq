import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import {
	recognizeRulesSourceFilename,
	tournamentRulesConventions,
} from '@/lib/rules/document-family-conventions'
import { reconstructPhysicalLines, type PdfTextItem } from '../core-rules/lines'
import { inspectDrawings } from './drawings'
import {
	reconstructTournamentRulesSourceRows,
	type TournamentRulesForensicRow,
	type TournamentRulesSourceRow,
} from './source-rows'

const SOURCES_DIRECTORY = resolve(import.meta.dirname, '..', '..', 'sources')
const FORENSIC_PDF_FILENAME = /^Tournament-Rules-(\d{4}-\d{2}-\d{2})\.pdf$/u

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
	rows: readonly TournamentRulesSourceRow[]
}>

async function readTournamentPdf(path: string) {
	const absolutePath = resolve(path)
	const filename = basename(absolutePath)
	const version = filename.match(FORENSIC_PDF_FILENAME)?.[1] ?? null
	const data = new Uint8Array(await readFile(absolutePath))
	const loadingTask = getDocument({ data })
	const document = await loadingTask.promise
	const pageCount = document.numPages
	let physicalLineCount = 0
	let title = ''
	let lastUpdated = ''

	async function* sourcePages() {
		for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
			// PDF pages are intentionally sequential to cap memory use.
			// oxlint-disable-next-line no-await-in-loop
			const page = await document.getPage(pageNumber)
			try {
				// oxlint-disable-next-line no-await-in-loop
				const [textContent, operatorList] = await Promise.all([page.getTextContent(), page.getOperatorList()])
				const textItems: PdfTextItem[] = textContent.items.filter((item) => 'str' in item)
				const physicalLines = reconstructPhysicalLines(textItems, pageNumber)
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
				yield { page: pageNumber, items: textItems, drawings: inspectDrawings(operatorList) }
			} finally {
				page.cleanup()
			}
		}
	}

	let reconstruction: Awaited<ReturnType<typeof reconstructTournamentRulesSourceRows>>
	try {
		reconstruction = await reconstructTournamentRulesSourceRows(sourcePages())
	} finally {
		await loadingTask.destroy()
	}
	return { absolutePath, filename, version, pageCount, physicalLineCount, title, lastUpdated, reconstruction }
}

export async function inspectTournamentPdf(path: string) {
	const inspected = await readTournamentPdf(path)
	const fileStats = await stat(inspected.absolutePath)
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
		bytes: fileStats.size,
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
}

export async function defaultTournamentPdfPaths() {
	const filenames = await readdir(SOURCES_DIRECTORY)
	return filenames
		.flatMap((filename) => {
			const source = recognizeRulesSourceFilename(filename)
			return source?.kind === 'pdf' && source.family === 'tournament-rules'
				? [{ filename, version: source.version }]
				: []
		})
		.toSorted((left, right) => tournamentRulesConventions.compareVersions(left.version, right.version))
		.map(({ filename }) => join(SOURCES_DIRECTORY, filename))
}

export async function readTournamentRulesSource(path: string): Promise<TournamentRulesSource> {
	const { filename, version, title, lastUpdated, reconstruction } = await readTournamentPdf(path)
	return { file: filename, version, title, lastUpdated, rows: reconstruction.sourceRows }
}

export type TournamentPdfReport = Awaited<ReturnType<typeof inspectTournamentPdf>>

export function printTournamentReport(report: TournamentPdfReport): void {
	console.log(`\n${report.file}`)
	console.log(`  ${report.title || 'Unknown title'} | Last Updated: ${report.lastUpdated || 'unknown'}`)
	console.log(`  ${(report.bytes / 1024 / 1024).toFixed(1)} MiB | ${report.pages} pages`)
	console.log(
		`  Rows: ${report.rowCount} (${report.numberedRowCount} numbered, ${report.unnumberedRowCount} unnumbered)`,
	)
	console.log(`  Active/deleted: ${report.activeRowCount}/${report.deletedRowCount}`)
	console.log(
		`  Headings: ${report.headingCounts.primary} primary, ${report.headingCounts.secondary} secondary`,
	)
	console.log(`  Cross-page joins: ${report.crossPageJoins}`)
	console.log(
		`  Missing label periods: ${report.diagnostics.filter(({ code }) => code === 'missing-label-period').length}`,
	)
	console.log(`  Malformed/missing labels: ${report.malformedLabels.length}/${report.missingIds.length}`)
	console.log(`  Duplicate IDs: ${Object.keys(report.duplicateIds).length}`)
	console.log(`  Backwards IDs: ${report.backwardsIds.length}`)
	console.log(`  Strikeout removals: ${report.strikeoutRemovals.length}`)
	for (const removal of report.strikeoutRemovals) {
		console.log(`    p${removal.page} ${removal.rawLabel || '(unnumbered)'} ${removal.removedText}`)
	}
	console.log(`  Highlighted active rows: ${report.highlightedActiveRows.length}`)
}
