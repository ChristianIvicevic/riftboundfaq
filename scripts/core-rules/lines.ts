const BASELINE_TOLERANCE = 1
const TOP_EDGE_TOLERANCE = 1

export type PdfTextItem = {
	str: string
	transform: number[]
	width: number
	height: number
}

export type PhysicalLine = {
	page: number
	line: number
	x: number
	y: number
	width: number
	text: string
	items: PdfTextItem[]
}

type PendingPhysicalLine = {
	page: number
	y: number
	items: PdfTextItem[]
}

function isPdfTextItem(item: unknown): item is PdfTextItem {
	if (typeof item !== 'object' || item === null) return false
	const candidate = item as Partial<PdfTextItem>
	return (
		typeof candidate.str === 'string' &&
		Array.isArray(candidate.transform) &&
		candidate.transform.length >= 6 &&
		candidate.transform.every(Number.isFinite) &&
		typeof candidate.width === 'number' &&
		Number.isFinite(candidate.width) &&
		typeof candidate.height === 'number' &&
		Number.isFinite(candidate.height)
	)
}

function fontSize(item: PdfTextItem) {
	return Math.hypot(item.transform[0], item.transform[1])
}

function horizontalGap(previous: PdfTextItem, current: PdfTextItem) {
	return current.transform[4] - (previous.transform[4] + previous.width)
}

function topEdge(item: PdfTextItem) {
	return item.transform[5] + (item.height || fontSize(item))
}

function sharesPhysicalLine(line: PendingPhysicalLine, item: PdfTextItem) {
	return line.items.some((existing) => {
		if (Math.abs(existing.transform[5] - item.transform[5]) <= BASELINE_TOLERANCE) return true
		const mixedSizes = Math.abs(fontSize(existing) - fontSize(item)) > BASELINE_TOLERANCE
		return mixedSizes && Math.abs(topEdge(existing) - topEdge(item)) <= TOP_EDGE_TOLERANCE
	})
}

function needsGeometricSpace(previous: PdfTextItem, current: PdfTextItem) {
	const threshold = Math.max(0.75, Math.min(fontSize(previous), fontSize(current)) * 0.1)
	return horizontalGap(previous, current) > threshold
}

export function reconstructText(items: readonly PdfTextItem[]) {
	const sortedItems = items.toSorted((left, right) => left.transform[4] - right.transform[4])
	let text = ''
	let previousTextItem: PdfTextItem | null = null
	let explicitSpace = false

	for (const item of sortedItems) {
		if (item.str.trim() === '') {
			if (item.str.length > 0) explicitSpace = true
			continue
		}

		if (
			text &&
			!text.endsWith(' ') &&
			(explicitSpace || (previousTextItem && needsGeometricSpace(previousTextItem, item)))
		) {
			text += ' '
		}

		text += item.str
		previousTextItem = item
		explicitSpace = false
	}

	return text.replaceAll(/\s+/gu, ' ').trim()
}

export function reconstructPhysicalLines(items: readonly unknown[], pageNumber: number): PhysicalLine[] {
	const textItems = items
		.filter((item): item is PdfTextItem => isPdfTextItem(item))
		.filter((item) => item.str.length > 0)
		.toSorted(
			(left, right) => right.transform[5] - left.transform[5] || left.transform[4] - right.transform[4],
		)
	const lines: PendingPhysicalLine[] = []

	for (const item of textItems) {
		const y = item.transform[5]
		const currentLine = lines.at(-1)
		if (!currentLine || !sharesPhysicalLine(currentLine, item)) {
			lines.push({ page: pageNumber, y, items: [item] })
			continue
		}

		currentLine.items.push(item)
	}

	return lines
		.filter((line) => line.items.some((item) => item.str.trim() !== ''))
		.map((line, index) => {
			const sortedItems = line.items.toSorted((left, right) => left.transform[4] - right.transform[4])
			const x = Math.min(...sortedItems.map((item) => item.transform[4]))
			const right = Math.max(...sortedItems.map((item) => item.transform[4] + item.width))
			return {
				page: line.page,
				line: index + 1,
				x: Math.round(x * 100) / 100,
				y: Math.round(line.y * 100) / 100,
				width: Math.round((right - x) * 100) / 100,
				text: reconstructText(sortedItems),
				items: sortedItems,
			}
		})
}
