import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { PdfTextItem as TextItem } from '../core-rules/lines.ts'
import { reconstructPhysicalLines, reconstructText } from '../core-rules/lines.ts'
import {
	inspectDrawings,
	type DrawingBounds,
	type DrawingInspection,
	type DrawingStroke,
} from './drawings.ts'

const SOURCES_DIRECTORY = resolve(import.meta.dirname, '..', '..', 'sources')
const PDF_FILENAME = /^Tournament-Rules-(\d{4}-\d{2}-\d{2})\.pdf$/u
const LABEL_CELL_LEFT_MAXIMUM = 50
const LABEL_CELL_RIGHT = 126
const BODY_CELL_LEFT = 126
const STRICT_LABEL = /^(\d{3}(?:\.(?:\d+|[a-z]))*)\.$/u
const MISSING_PERIOD_LABEL = /^(\d{3}(?:\.(?:\d+|[a-z]))*)$/u
const LABEL_LIKE = /^\d{3}(?:\.[0-9A-Za-z]+)*\.?$/u

type RowKind = 'primary-heading' | 'secondary-heading' | 'rule'
type LabelDiagnostic = 'missing-label-period' | 'malformed-label'
type RoundedBounds = DrawingBounds

type SourceItem = RoundedBounds & {
	text: string
	fontSize: number
}

type RowGeometry = {
	bounds: RoundedBounds
	labelBounds: RoundedBounds | null
	bodyBounds: RoundedBounds | null
	items: SourceItem[]
	strikeStrokes: DrawingStroke[]
	highlightFills: RoundedBounds[]
	continuationRows?: RowGeometry[]
}

export type TournamentRow = {
	sequence: number
	page: number
	pageRow: number
	pagePosition: number
	pageRowCount: number
	rawLabel: string
	id: string | null
	label: string | null
	text: string
	kind: RowKind
	fontSize: number | null
	active: boolean
	highlighted: boolean
	removedText: string
	diagnostics: LabelDiagnostic[]
	continuation: boolean
	source: { startPage: number; endPage: number }
	geometry: RowGeometry
}

function round(value: number): number {
	return Math.round(value * 100) / 100
}

function roundedBounds(bounds: DrawingBounds): RoundedBounds {
	return {
		x: round(bounds.x),
		y: round(bounds.y),
		width: round(bounds.width),
		height: round(bounds.height),
	}
}

function roundedStroke(stroke: DrawingStroke): DrawingStroke {
	return {
		x: round(stroke.x),
		y: round(stroke.y),
		width: round(stroke.width),
		height: round(stroke.height),
		lineWidth: round(stroke.lineWidth),
	}
}

function fontSize(item: TextItem): number {
	return Math.hypot(item.transform[0], item.transform[1])
}

function sourceItem(item: TextItem): SourceItem {
	return {
		text: item.str,
		x: round(item.transform[4]),
		y: round(item.transform[5]),
		width: round(item.width),
		height: round(item.height || fontSize(item)),
		fontSize: round(fontSize(item)),
	}
}

function overlaps(left: DrawingBounds, right: DrawingBounds, padding = 0): boolean {
	return (
		left.x <= right.x + right.width + padding &&
		left.x + left.width >= right.x - padding &&
		left.y <= right.y + right.height + padding &&
		left.y + left.height >= right.y - padding
	)
}

function textBounds(items: TextItem[]): DrawingBounds | null {
	if (items.length === 0) return null
	const left = Math.min(...items.map((item) => item.transform[4]))
	const bottom = Math.min(...items.map((item) => item.transform[5]))
	const right = Math.max(...items.map((item) => item.transform[4] + item.width))
	const top = Math.max(...items.map((item) => item.transform[5] + (item.height || fontSize(item))))
	return { x: left, y: bottom, width: right - left, height: top - bottom }
}

function reconstructMultilineText(items: TextItem[], pageNumber: number): string {
	return reconstructPhysicalLines(items, pageNumber)
		.map(({ text }) => text)
		.join(' ')
		.replaceAll(/\s+/gu, ' ')
		.trim()
}

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

function parseLabel(rawLabel: string): {
	id: string | null
	label: string | null
	diagnostics: LabelDiagnostic[]
} {
	if (!rawLabel) return { id: null, label: null, diagnostics: [] }
	const strictMatch = rawLabel.match(STRICT_LABEL)
	if (strictMatch) return { id: strictMatch[1], label: rawLabel, diagnostics: [] }
	const missingPeriodMatch = rawLabel.match(MISSING_PERIOD_LABEL)
	if (missingPeriodMatch) {
		return {
			id: missingPeriodMatch[1],
			label: `${rawLabel}.`,
			diagnostics: ['missing-label-period'],
		}
	}
	return { id: null, label: rawLabel, diagnostics: ['malformed-label'] }
}

function dominantFontSize(items: TextItem[]): number | null {
	const weights = new Map<number, number>()
	for (const item of items) {
		const size = round(fontSize(item))
		weights.set(size, (weights.get(size) ?? 0) + item.str.trim().length)
	}
	return [...weights].toSorted((left, right) => right[1] - left[1])[0]?.[0] ?? null
}

function classifyRow(items: TextItem[]): { kind: RowKind; fontSize: number | null } {
	const size = dominantFontSize(items)
	if (size !== null && size >= 20) return { kind: 'primary-heading', fontSize: size }
	if (size !== null && size >= 10) return { kind: 'secondary-heading', fontSize: size }
	return { kind: 'rule', fontSize: size }
}

function normalizeDocumentDate(value: string): string {
	const numericDate = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u)
	if (!numericDate) return value
	return `${numericDate[3]}-${numericDate[1].padStart(2, '0')}-${numericDate[2].padStart(2, '0')}`
}

function rowFromItems(
	pageNumber: number,
	rowIndex: number,
	top: number,
	bottom: number,
	items: TextItem[],
	drawings: DrawingInspection,
): TournamentRow {
	const labelItems = items.filter((item) => {
		const text = item.str.trim()
		return (
			item.transform[4] <= LABEL_CELL_LEFT_MAXIMUM &&
			item.transform[4] < LABEL_CELL_RIGHT &&
			LABEL_LIKE.test(text)
		)
	})
	const bodyItems = items.filter((item) => item.transform[4] >= BODY_CELL_LEFT)
	const rawLabel = reconstructText(labelItems)
	const parsed = parseLabel(rawLabel)
	const bodyText = reconstructMultilineText(bodyItems, pageNumber)
	const labelBounds = textBounds(labelItems)
	const bodyBounds = textBounds(bodyItems)
	const rowBounds = { x: 36, y: bottom, width: 539, height: top - bottom }
	const strikeStrokes = drawings.horizontalStrokes.filter((stroke) => {
		if (!overlaps(stroke, rowBounds)) return false
		return items.some((item) => {
			const bounds = textBounds([item])!
			const middle = bounds.y + bounds.height * 0.5
			return (
				stroke.x <= bounds.x + bounds.width &&
				stroke.x + stroke.width >= bounds.x &&
				Math.abs(stroke.y - middle) <= Math.max(2.5, bounds.height * 0.35)
			)
		})
	})
	const highlightFills = drawings.yellowFills.filter((fill) => overlaps(fill, rowBounds))
	const struckItems = items.filter((item) => {
		const bounds = textBounds([item])!
		const middle = bounds.y + bounds.height * 0.5
		return strikeStrokes.some(
			(stroke) =>
				stroke.x <= bounds.x + bounds.width &&
				stroke.x + stroke.width >= bounds.x &&
				Math.abs(stroke.y - middle) <= Math.max(2.5, bounds.height * 0.35),
		)
	})
	const removedText = reconstructMultilineText(struckItems, pageNumber)
	const highlighted = highlightFills.some((fill) =>
		items.some((item) => overlaps(fill, textBounds([item])!, 1)),
	)
	const classification = classifyRow([...labelItems, ...bodyItems])

	return {
		sequence: 0,
		page: pageNumber,
		pageRow: rowIndex,
		rawLabel,
		id: parsed.id,
		label: parsed.label,
		text: bodyText,
		kind: classification.kind,
		fontSize: classification.fontSize,
		active: strikeStrokes.length === 0,
		highlighted,
		removedText,
		diagnostics: parsed.diagnostics,
		continuation: false,
		source: { startPage: pageNumber, endPage: pageNumber },
		pagePosition: 0,
		pageRowCount: 0,
		geometry: {
			bounds: roundedBounds(rowBounds),
			labelBounds: labelBounds && roundedBounds(labelBounds),
			bodyBounds: bodyBounds && roundedBounds(bodyBounds),
			items: items.map((item) => sourceItem(item)),
			strikeStrokes: strikeStrokes.map((stroke) => roundedStroke(stroke)),
			highlightFills: highlightFills.map((fill) => roundedBounds(fill)),
		},
	}
}

function tableBorders(lines: DrawingBounds[]): number[] {
	const candidates = lines
		.filter(({ width, height, x }) => width > 500 && height <= 2 && x < 45)
		.map(({ y, height }) => y + height / 2)
		.toSorted((left, right) => right - left)
	const borders: number[] = []
	for (const candidate of candidates) {
		if (!borders.some((border) => Math.abs(border - candidate) < 1.5)) borders.push(candidate)
	}
	return borders
}

function pageRows(pageNumber: number, items: TextItem[], drawings: DrawingInspection): TournamentRow[] {
	const borders = tableBorders(drawings.tableLines)
	const rows: TournamentRow[] = []
	for (let index = 0; index < borders.length - 1; index++) {
		const top = borders[index]
		const bottom = borders[index + 1]
		const intervalItems = items.filter((item) => {
			const text = item.str.trim()
			const y = item.transform[5] + (item.height || fontSize(item)) / 2
			return text && item.transform[4] >= 35 && item.transform[4] <= 575 && y < top && y > bottom
		})
		if (intervalItems.length === 0) continue
		const labelBaselines = intervalItems
			.filter((item) => item.transform[4] <= LABEL_CELL_LEFT_MAXIMUM && LABEL_LIKE.test(item.str.trim()))
			.map((item) => item.transform[5])
			.toSorted((left, right) => right - left)
		if (labelBaselines.length <= 1) {
			rows.push(rowFromItems(pageNumber, index + 1, top, bottom, intervalItems, drawings))
			continue
		}

		const splitBoundaries = labelBaselines
			.slice(0, -1)
			.map((baseline, labelIndex) => (baseline + labelBaselines[labelIndex + 1]) / 2)
		const segmentBounds = [top, ...splitBoundaries, bottom]
		for (let segment = 0; segment < segmentBounds.length - 1; segment++) {
			const segmentTop = segmentBounds[segment]
			const segmentBottom = segmentBounds[segment + 1]
			const segmentItems = intervalItems.filter((item) => {
				const y = item.transform[5] + (item.height || fontSize(item)) / 2
				return y < segmentTop && y > segmentBottom
			})
			if (segmentItems.length > 0) {
				rows.push(
					rowFromItems(
						pageNumber,
						index + (segment + 1) / 10,
						segmentTop,
						segmentBottom,
						segmentItems,
						drawings,
					),
				)
			}
		}
	}
	rows.forEach((row, index) => {
		row.pagePosition = index + 1
		row.pageRowCount = rows.length
	})
	return rows
}

function joinCrossPageRows(rows: TournamentRow[]): { rows: TournamentRow[]; crossPageJoins: number } {
	const joined: TournamentRow[] = []
	let crossPageJoins = 0
	for (const row of rows) {
		const previous = joined.at(-1)
		const isFirstPageRow = row.pagePosition === 1
		const previousIsLastPageRow = previous && previous.pagePosition === previous.pageRowCount
		if (!row.rawLabel && isFirstPageRow && previousIsLastPageRow && row.page === previous.page + 1) {
			previous.text = `${previous.text} ${row.text}`.replaceAll(/\s+/gu, ' ').trim()
			previous.source.endPage = row.page
			previous.continuation = true
			previous.geometry.continuationRows ??= []
			previous.geometry.continuationRows.push(row.geometry)
			crossPageJoins++
			continue
		}
		joined.push(row)
	}
	joined.forEach((row, index) => (row.sequence = index + 1))
	return { rows: joined, crossPageJoins }
}

type DuplicateIdEntry = {
	sequence: number
	page: number
	active: boolean
	rawLabel: string
}

function duplicateIds(rows: TournamentRow[]): Record<string, DuplicateIdEntry[]> {
	const occurrences = new Map<string, DuplicateIdEntry[]>()
	for (const row of rows) {
		if (!row.id) continue
		const existing = occurrences.get(row.id) ?? []
		existing.push({ sequence: row.sequence, page: row.page, active: row.active, rawLabel: row.rawLabel })
		occurrences.set(row.id, existing)
	}
	return Object.fromEntries([...occurrences].filter(([, entries]) => entries.length > 1))
}

export async function defaultTournamentPdfPaths() {
	const filenames = await readdir(SOURCES_DIRECTORY)
	return filenames
		.map((filename) => ({ filename, match: filename.match(PDF_FILENAME) }))
		.filter((entry): entry is { filename: string; match: RegExpMatchArray } => entry.match !== null)
		.toSorted((left, right) => left.match[1].localeCompare(right.match[1]))
		.map(({ filename }) => join(SOURCES_DIRECTORY, filename))
}

export async function inspectTournamentPdf(path: string) {
	const absolutePath = resolve(path)
	const filename = basename(absolutePath)
	const version = filename.match(PDF_FILENAME)?.[1] ?? null
	const data = new Uint8Array(await readFile(absolutePath))
	const loadingTask = getDocument({ data, disableWorker: true } as NonNullable<
		Parameters<typeof getDocument>[0]
	> & {
		disableWorker: boolean
	})
	const document = await loadingTask.promise
	const allRows: TournamentRow[] = []
	let physicalLineCount = 0
	let title = ''
	let lastUpdated = ''

	for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
		// PDF pages are intentionally sequential to cap memory use.
		// oxlint-disable-next-line no-await-in-loop
		const page = await document.getPage(pageNumber)
		// oxlint-disable-next-line no-await-in-loop
		const [textContent, operatorList] = await Promise.all([page.getTextContent(), page.getOperatorList()])
		const textItems = textContent.items.filter((item) => 'str' in item) as TextItem[]
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
		const drawings = inspectDrawings(operatorList)
		allRows.push(...pageRows(pageNumber, textItems, drawings))
		page.cleanup()
	}

	await loadingTask.destroy()
	const fileStats = await stat(absolutePath)
	const { rows, crossPageJoins } = joinCrossPageRows(allRows)
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
		pages: document.numPages,
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
		crossPageJoins,
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
