import { reconstructText, type PdfTextItem, type PhysicalLine } from './lines.ts'

const RULE_LABEL_CANDIDATE = /^(\d{3}(?:\.[0-9A-Za-z]+)*)(?:\.)?$/u
const RULE_LIKE_TEXT = /^\d{3}(?:\.[0-9A-Za-z]+)*(?:\.|\b)/u

export type SourceLine = {
	page: number
	line: number
	x: number
	y: number
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
	lines: string[]
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

function classifyHeading(label: PdfTextItem, bodyItems: readonly PdfTextItem[]) {
	const labelSize = roundedFontSize(label)
	const candidate: RuleBlock['heading'] = labelSize >= 20 ? 'primary' : labelSize >= 10 ? 'secondary' : null
	if (!candidate) return { heading: null, headingStyleMismatch: null }

	const bodyFontSize = dominantFontSize(bodyItems)
	const tolerance = Math.max(1, labelSize * 0.1)
	if (bodyFontSize !== null && Math.abs(labelSize - bodyFontSize) <= tolerance) {
		return { heading: candidate, headingStyleMismatch: null }
	}

	return {
		heading: null,
		headingStyleMismatch: { labelFontSize: labelSize, bodyFontSize },
	}
}

function bodyItemsOnLine(line: PhysicalLine, label: PdfTextItem) {
	const labelRight = label.transform[4] + label.width
	return line.items.filter((item) => item.str.trim() !== '' && item.transform[4] >= labelRight)
}

function sourceLine(line: PhysicalLine, text: string, x = line.x): SourceLine {
	return { page: line.page, line: line.line, x, y: line.y, text }
}

function normalizedLines(lines: readonly SourceLine[]) {
	const text = lines
		.map((line) => line.text)
		.filter(Boolean)
		.join(' ')
		.replaceAll(/\s+/gu, ' ')
		.trim()
	if (!text) return []

	return text
		.split(/(?=Example:|See rule )/gu)
		.map((part) => part.trim())
		.filter(Boolean)
}

function finalizeBlock(block: PendingRuleBlock): RuleBlock {
	const lines = normalizedLines(block.sourceLines)
	const lastSourceLine = block.sourceLines.at(-1)
	return {
		...block,
		lines,
		text: lines.join(' '),
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
					current.sourceLines.push(sourceLine(line, line.text))
					current.physicalLineCount++
				} else unassignedLines.push(sourceLine(line, line.text))
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
				sourceLines: bodyText ? [sourceLine(line, bodyText, bodyX ?? line.x)] : [],
			}
		}
	}

	if (current) blocks.push(finalizeBlock(current))
	return { blocks, unassignedLines, ruleLikeTextOutsideLabelColumn }
}
