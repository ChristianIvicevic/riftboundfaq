import type { RuleContent } from '@/lib/rules/core-rules-document'
import { reconstructText, type PdfTextItem, type PhysicalLine } from './lines'

const RULE_LABEL_CANDIDATE = /^(\d{3}(?:\.[0-9A-Za-z]+)*)(?:\.)?$/u
const RULE_LIKE_TEXT = /^\d{3}(?:\.[0-9A-Za-z]+)*(?:\.|\b)/u
// Core Rules list rows use one 36pt indent and stop well before the text column's right edge.
const LIST_INDENT = 36
const LIST_X_TOLERANCE = 1
const LIST_MINIMUM_RIGHT_MARGIN = 100
const NON_LIST_ROW = /^(?:\d+[.)]\s|Examples?:|e\.g\.,|See rule |Reminder:)/u

export type SourceLine = {
	page: number
	line: number
	x: number
	y: number
	right: number
	pageWidth: number
	text: string
}

export type RuleBlock = {
	sequence: number
	id: string
	label: string
	issues: string[]
	page: number
	sourceLine: number
	x: number
	y: number
	bodyX: number | null
	fontSize: number
	heading: 'primary' | 'secondary' | null
	headingStyleMismatch: { labelFontSize: number; bodyFontSize: number | null } | null
	physicalLineCount: number
	sourceLines: SourceLine[]
	lines: RuleContent[]
	text: string
	source: { startPage: number; startLine: number; endPage: number; endLine: number }
}

export type RulePage = {
	page: number
	width: number
	lines: PhysicalLine[]
}

type PendingRuleBlock = Omit<RuleBlock, 'lines' | 'text' | 'source'>

function fontSize(item: PdfTextItem) {
	return Math.hypot(item.transform[0], item.transform[1])
}

function roundedFontSize(item: PdfTextItem) {
	return Math.round(fontSize(item) * 100) / 100
}

function parseRuleLabel(rawLabel: string) {
	const match = rawLabel.trim().match(RULE_LABEL_CANDIDATE)
	if (!match) return null

	const id = match[1]
	const issues: string[] = []
	if (/[A-Z]/u.test(id)) issues.push('uppercase-segment')
	return { id, label: `${id}.`, issues }
}

function dominantFontSize(items: readonly PdfTextItem[]) {
	const weights = new Map<number, number>()
	for (const item of items) {
		const size = roundedFontSize(item)
		weights.set(size, (weights.get(size) ?? 0) + item.str.trim().length)
	}
	return [...weights].toSorted((left, right) => right[1] - left[1])[0]?.[0] ?? null
}

function headingLevel(size: number | null): RuleBlock['heading'] {
	if (size === null) return null
	if (size >= 20) return 'primary'
	if (size >= 10) return 'secondary'
	return null
}

function classifyHeading(label: PdfTextItem, bodyItems: readonly PdfTextItem[]) {
	const labelSize = roundedFontSize(label)
	const bodyFontSize = dominantFontSize(bodyItems)
	const heading = headingLevel(bodyFontSize)
	const labelHeading = headingLevel(labelSize)
	const hasHeadingStyle = labelHeading !== null || heading !== null
	const tolerance = Math.max(1, labelSize * 0.1)
	const sizesMatch = bodyFontSize !== null && Math.abs(labelSize - bodyFontSize) <= tolerance
	if (!hasHeadingStyle || (labelHeading === heading && sizesMatch)) {
		return { heading, headingStyleMismatch: null }
	}

	return {
		heading,
		headingStyleMismatch: { labelFontSize: labelSize, bodyFontSize },
	}
}

function bodyItemsOnLine(line: PhysicalLine, label: PdfTextItem) {
	const labelRight = label.transform[4] + label.width
	return line.items.filter((item) => item.str.trim() !== '' && item.transform[4] >= labelRight)
}

function roundedCoordinate(value: number) {
	return Math.round(value * 100) / 100
}

function sourceLine(
	line: PhysicalLine,
	text: string,
	pageWidth: number,
	items: readonly PdfTextItem[] = line.items,
): SourceLine {
	const contentItems = items.filter((item) => item.str.trim() !== '')
	const x = Math.min(...contentItems.map((item) => item.transform[4]))
	const right = Math.max(...contentItems.map((item) => item.transform[4] + item.width))
	return {
		page: line.page,
		line: line.line,
		x: roundedCoordinate(x),
		y: line.y,
		right: roundedCoordinate(right),
		pageWidth,
		text,
	}
}

function joinedText(lines: readonly SourceLine[]) {
	return lines
		.map((line) => line.text)
		.filter(Boolean)
		.join(' ')
		.replaceAll(/\s+/gu, ' ')
		.trim()
}

function contentFromText(text: string): RuleContent[] {
	if (!text) return []

	return text
		.split(/(?=Example:|See rule )/gu)
		.map((part) => part.trim())
		.filter(Boolean)
		.map((part) => {
			if (part.startsWith('Example:')) return { kind: 'example', text: part }
			if (part.startsWith('See rule ')) return { kind: 'reference', text: part }
			if (part.startsWith('* ')) return { kind: 'bullet', text: part.slice(2) }
			return { kind: 'paragraph', text: part }
		})
}

function atListIndent(line: SourceLine, bodyX: number) {
	return Math.abs(line.x - (bodyX + LIST_INDENT)) <= LIST_X_TOLERANCE
}

function hasListWidth(line: SourceLine) {
	return line.pageWidth - line.right >= LIST_MINIMUM_RIGHT_MARGIN
}

function listRunEnd(lines: readonly SourceLine[], start: number, bodyX: number) {
	let end = start
	while (
		end < lines.length &&
		atListIndent(lines[end], bodyX) &&
		hasListWidth(lines[end]) &&
		!NON_LIST_ROW.test(lines[end].text)
	) {
		end++
	}
	return end - start >= 2 ? end : start
}

function normalizeProseAndLists(lines: readonly SourceLine[], bodyX: number): RuleContent[] {
	const content: RuleContent[] = []
	let prose: SourceLine[] = []
	const flushProse = () => {
		content.push(...contentFromText(joinedText(prose)))
		prose = []
	}

	for (let index = 0; index < lines.length;) {
		const end = listRunEnd(lines, index, bodyX)
		if (end === index) {
			prose.push(lines[index])
			index++
			continue
		}

		flushProse()
		for (const line of lines.slice(index, end)) content.push({ kind: 'bullet', text: line.text })
		index = end
	}

	flushProse()
	return content
}

function samePageGap(previous: SourceLine, current: SourceLine) {
	return previous.page === current.page ? previous.y - current.y : null
}

function normalizeExamples(marker: SourceLine, lines: readonly SourceLine[]): RuleContent[] {
	if (lines.length === 0) return []
	const gaps = [marker, ...lines].flatMap((line, index, allLines) => {
		const next = allLines[index + 1]
		if (!next) return []
		const gap = samePageGap(line, next)
		return gap !== null && gap > 0 ? [gap] : []
	})
	if (gaps.length === 0) return lines.map(({ text }) => ({ kind: 'example', text }))
	const normalLeading = Math.min(...gaps)
	const itemGap = normalLeading * 1.5
	const spaced = gaps.some((gap) => gap >= itemGap)
	// Compact groups put one example on every row; spaced groups use a blank row between examples.
	if (!spaced) return lines.map(({ text }) => ({ kind: 'example', text }))

	const examples: RuleContent[] = []
	let current = ''
	for (let index = 0; index < lines.length; index++) {
		const line = lines[index]
		const previous = lines[index - 1]
		const pageBreakStartsItem =
			previous &&
			previous.page !== line.page &&
			previous.pageWidth - previous.right >= LIST_MINIMUM_RIGHT_MARGIN
		const gap = previous ? samePageGap(previous, line) : null
		const startsItem = index === 0 || pageBreakStartsItem || (gap !== null && gap >= itemGap)

		if (startsItem && current) {
			examples.push({ kind: 'example', text: current })
			current = line.text
		} else current = current ? `${current} ${line.text}` : line.text
	}
	if (current) examples.push({ kind: 'example', text: current })
	return examples
}

function normalizedLines(lines: readonly SourceLine[], bodyX: number | null): RuleContent[] {
	if (lines.length === 0) return []
	const effectiveBodyX = bodyX ?? lines[0].x
	const examplesIndex = lines.findIndex(({ text }) => text === 'Examples:')
	if (examplesIndex < 0) return normalizeProseAndLists(lines, effectiveBodyX)

	const marker = lines[examplesIndex]
	return [
		...normalizeProseAndLists(lines.slice(0, examplesIndex), effectiveBodyX),
		{ kind: 'paragraph', text: marker.text },
		...normalizeExamples(marker, lines.slice(examplesIndex + 1)),
	]
}

function finalizeBlock(block: PendingRuleBlock): RuleBlock {
	const lines = normalizedLines(block.sourceLines, block.bodyX)
	const lastSourceLine = block.sourceLines.at(-1)
	return {
		...block,
		lines,
		text: joinedText(block.sourceLines),
		source: {
			startPage: block.page,
			startLine: block.sourceLine,
			endPage: lastSourceLine?.page ?? block.page,
			endLine: lastSourceLine?.line ?? block.sourceLine,
		},
	}
}

export function assembleRuleBlocks(pages: readonly RulePage[]) {
	const blocks: RuleBlock[] = []
	const unassignedLines: SourceLine[] = []
	let current: PendingRuleBlock | null = null
	let ruleLikeTextOutsideLabelColumn = 0

	for (const page of pages) {
		const labelColumnLimit = page.width * 0.2
		for (const line of page.lines) {
			for (const item of line.items) {
				if (RULE_LIKE_TEXT.test(item.str) && item.transform[4] > labelColumnLimit) {
					ruleLikeTextOutsideLabelColumn++
				}
			}

			const labelItem = line.items.find(
				(item) => item.transform[4] <= labelColumnLimit && parseRuleLabel(item.str) !== null,
			)
			if (!labelItem) {
				if (current) {
					current.sourceLines.push(sourceLine(line, line.text, page.width))
					current.physicalLineCount++
				} else unassignedLines.push(sourceLine(line, line.text, page.width))
				continue
			}

			if (current) blocks.push(finalizeBlock(current))
			const parsedLabel = parseRuleLabel(labelItem.str)
			if (!parsedLabel) throw new Error(`Unable to parse matched rule label ${labelItem.str}`)
			const bodyItems = bodyItemsOnLine(line, labelItem)
			const bodyText = reconstructText(bodyItems)
			const classification = classifyHeading(labelItem, bodyItems)
			const bodyX =
				bodyItems.length > 0
					? Math.round(Math.min(...bodyItems.map((item) => item.transform[4])) * 100) / 100
					: null

			current = {
				sequence: blocks.length + 1,
				id: parsedLabel.id,
				label: parsedLabel.label,
				issues: parsedLabel.issues,
				page: line.page,
				sourceLine: line.line,
				x: Math.round(labelItem.transform[4] * 100) / 100,
				y: Math.round(labelItem.transform[5] * 100) / 100,
				bodyX,
				fontSize: roundedFontSize(labelItem),
				heading: classification.heading,
				headingStyleMismatch: classification.headingStyleMismatch,
				physicalLineCount: 1,
				sourceLines: bodyText ? [sourceLine(line, bodyText, page.width, bodyItems)] : [],
			}
		}
	}

	if (current) blocks.push(finalizeBlock(current))
	return { blocks, unassignedLines, ruleLikeTextOutsideLabelColumn }
}
