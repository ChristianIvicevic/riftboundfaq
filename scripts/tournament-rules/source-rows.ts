import type { PdfTextItem } from '../core-rules/lines'
import { reconstructPhysicalLines, reconstructText } from '../core-rules/lines'
import type { DrawingBounds, DrawingInspection, DrawingStroke } from './drawings'

const LABEL_CELL_LEFT_MAXIMUM = 50
const LABEL_CELL_RIGHT = 126
const BODY_CELL_LEFT = 126
const STRICT_LABEL = /^(\d{3}(?:\.(?:\d+|[a-z]))*)\.$/u
const MISSING_PERIOD_LABEL = /^(\d{3}(?:\.(?:\d+|[a-z]))*)$/u
const LABEL_LIKE = /^\d{3}(?:\.[0-9A-Za-z]+)*\.?$/u

export type TournamentRulesSourcePage = Readonly<{
	page: number
	items: readonly PdfTextItem[]
	drawings: DrawingInspection
}>

export type TournamentRulesSourceRow = Readonly<{
	sequence: number
	label: Readonly<{
		sourceText: string
		id: string | null
		text: string
		normalization: 'unchanged' | 'added-period' | 'malformed'
	}> | null
	text: string
	kind: 'primary-heading' | 'secondary-heading' | 'rule'
	activity:
		| Readonly<{ status: 'active'; removalEvidence: null }>
		| Readonly<{
				status: 'removed'
				removalEvidence: Readonly<{ text: string; coverage: 'complete' | 'partial' }>
		  }>
	sourcePages: Readonly<{ start: number; end: number }>
}>

type LabelDiagnostic = 'missing-label-period' | 'malformed-label'
type RoundedBounds = DrawingBounds
type SourceItem = RoundedBounds & { text: string; fontSize: number }
type RowGeometry = {
	bounds: RoundedBounds
	labelBounds: RoundedBounds | null
	bodyBounds: RoundedBounds | null
	items: SourceItem[]
	strikeStrokes: DrawingStroke[]
	highlightFills: RoundedBounds[]
	continuationRows?: RowGeometry[]
}

export type TournamentRulesForensicRow = {
	sequence: number
	page: number
	pageRow: number
	pagePosition: number
	pageRowCount: number
	rawLabel: string
	id: string | null
	label: string | null
	text: string
	kind: TournamentRulesSourceRow['kind']
	fontSize: number | null
	active: boolean
	highlighted: boolean
	removedText: string
	diagnostics: LabelDiagnostic[]
	continuation: boolean
	source: { startPage: number; endPage: number }
	geometry: RowGeometry
}

type ParsedLabel = Pick<TournamentRulesForensicRow, 'id' | 'label' | 'diagnostics'>
type RowClassification = Pick<TournamentRulesForensicRow, 'kind' | 'fontSize'>

export type TournamentRulesSourceRowReconstructionErrorCode =
	| 'invalid-page-number'
	| 'noncontiguous-page-order'

export class TournamentRulesSourceRowReconstructionError extends Error {
	constructor(
		readonly code: TournamentRulesSourceRowReconstructionErrorCode,
		readonly page: number,
		readonly previousPage: number | null,
	) {
		super(
			code === 'invalid-page-number'
				? `Tournament Rules source page must be a positive integer: ${page}`
				: `Tournament Rules source pages must be contiguous: received ${page} after ${previousPage}`,
		)
		this.name = 'TournamentRulesSourceRowReconstructionError'
	}
}

function round(value: number): number {
	return Math.round(value * 100) / 100
}

function roundedBounds(bounds: DrawingBounds): RoundedBounds {
	return { x: round(bounds.x), y: round(bounds.y), width: round(bounds.width), height: round(bounds.height) }
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

function fontSize(item: PdfTextItem): number {
	return Math.hypot(item.transform[0], item.transform[1])
}

function sourceItem(item: PdfTextItem): SourceItem {
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

function textBounds(items: readonly PdfTextItem[]): DrawingBounds | null {
	if (items.length === 0) return null
	const left = Math.min(...items.map((item) => item.transform[4]))
	const bottom = Math.min(...items.map((item) => item.transform[5]))
	const right = Math.max(...items.map((item) => item.transform[4] + item.width))
	const top = Math.max(...items.map((item) => item.transform[5] + (item.height || fontSize(item))))
	return { x: left, y: bottom, width: right - left, height: top - bottom }
}

function reconstructMultilineText(items: PdfTextItem[], pageNumber: number): string {
	return reconstructPhysicalLines(items, pageNumber)
		.map(({ text }) => text)
		.join(' ')
		.replaceAll(/\s+/gu, ' ')
		.trim()
}

function parseLabel(rawLabel: string): ParsedLabel {
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

function dominantFontSize(items: readonly PdfTextItem[]): number | null {
	const weights = new Map<number, number>()
	for (const item of items) {
		const size = round(fontSize(item))
		weights.set(size, (weights.get(size) ?? 0) + item.str.trim().length)
	}
	return [...weights].toSorted((left, right) => right[1] - left[1])[0]?.[0] ?? null
}

function classifyRow(items: readonly PdfTextItem[]): RowClassification {
	const size = dominantFontSize(items)
	if (size !== null && size >= 20) return { kind: 'primary-heading', fontSize: size }
	if (size !== null && size >= 10) return { kind: 'secondary-heading', fontSize: size }
	return { kind: 'rule', fontSize: size }
}

function rowFromItems(
	pageNumber: number,
	rowIndex: number,
	top: number,
	bottom: number,
	items: PdfTextItem[],
	drawings: DrawingInspection,
): TournamentRulesForensicRow {
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

function tableBorders(lines: readonly DrawingBounds[]): number[] {
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

function pageRows(pageNumber: number, items: readonly PdfTextItem[], drawings: DrawingInspection) {
	const borders = tableBorders(drawings.tableLines)
	const rows: TournamentRulesForensicRow[] = []
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

function joinCrossPageRows(rows: TournamentRulesForensicRow[]): TournamentRulesForensicRow[] {
	const joined: TournamentRulesForensicRow[] = []
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
			continue
		}
		joined.push(row)
	}
	joined.forEach((row, index) => (row.sequence = index + 1))
	return joined
}

function sourceRow(row: TournamentRulesForensicRow): TournamentRulesSourceRow {
	const completeText = `${row.rawLabel}${row.text ? ` ${row.text}` : ''}`.trim()
	return {
		sequence: row.sequence,
		label: row.rawLabel
			? {
					sourceText: row.rawLabel,
					id: row.id,
					text: row.label!,
					normalization: row.diagnostics.includes('malformed-label')
						? 'malformed'
						: row.diagnostics.includes('missing-label-period')
							? 'added-period'
							: 'unchanged',
				}
			: null,
		text: row.text,
		kind: row.kind,
		activity: row.active
			? { status: 'active', removalEvidence: null }
			: {
					status: 'removed',
					removalEvidence: {
						text: row.removedText,
						coverage: row.removedText === completeText ? 'complete' : 'partial',
					},
				},
		sourcePages: { start: row.source.startPage, end: row.source.endPage },
	}
}

export async function reconstructTournamentRulesSourceRows(
	pages: AsyncIterable<TournamentRulesSourcePage>,
): Promise<
	Readonly<{
		sourceRows: readonly TournamentRulesSourceRow[]
		forensicRows: readonly TournamentRulesForensicRow[]
	}>
> {
	const rows: TournamentRulesForensicRow[] = []
	let previousPage: number | null = null
	for await (const page of pages) {
		if (!Number.isInteger(page.page) || page.page <= 0) {
			throw new TournamentRulesSourceRowReconstructionError('invalid-page-number', page.page, previousPage)
		}
		if (page.page !== (previousPage ?? 0) + 1) {
			throw new TournamentRulesSourceRowReconstructionError(
				'noncontiguous-page-order',
				page.page,
				previousPage,
			)
		}
		rows.push(...pageRows(page.page, page.items, page.drawings))
		previousPage = page.page
	}
	const forensicRows = joinCrossPageRows(rows)
	return { sourceRows: forensicRows.map((row) => sourceRow(row)), forensicRows }
}
