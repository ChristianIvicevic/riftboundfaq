import { describe, expect, test } from 'vitest'
import { assembleRuleBlocks, type RulePage } from './blocks'
import type { PdfTextItem } from './lines'

function textItem(str: string, x: number, y: number, size = 8, width = str.length * 4): PdfTextItem {
	return { str, transform: [size, 0, 0, size, x, y], width, height: size }
}

function rulePage(pageNumber: number, width: number, rows: PdfTextItem[][]): RulePage {
	return {
		page: pageNumber,
		width,
		lines: rows.map((items, index) => ({
			page: pageNumber,
			line: index + 1,
			x: Math.min(...items.map(({ transform }) => transform[4])),
			y: items[0].transform[5],
			width: 100,
			text: items
				.map(({ str }) => str.trim())
				.filter(Boolean)
				.join(' '),
			items,
		})),
	}
}

function assembleFixture() {
	return assembleRuleBlocks([
		rulePage(1, 600, [
			[textItem('preface', 80, 740)],
			[textItem('200.1.', 180, 720)],
			[textItem('100.', 20, 700, 20, 35), textItem('Game Concepts', 80, 700, 20, 130)],
			[textItem('100.1A.', 20, 660, 8, 40), textItem('First sentence.', 80, 660, 8, 55)],
			[textItem('wrapped sentence.', 80, 640, 8, 70)],
			[textItem('See rule 200.1.', 180, 620, 8, 70)],
		]),
		rulePage(2, 600, [
			[textItem('Example: Continued example.', 80, 740, 8, 110)],
			[textItem('100.2.', 20, 700, 12, 35), textItem('Actions', 80, 700, 12, 45)],
			[textItem('100.2.1.', 20, 660, 8, 45), textItem('* Resolve it.', 80, 660, 8, 55)],
		]),
	])
}

describe('assembleRuleBlocks', () => {
	test('reports extraction anomalies outside assembled blocks', () => {
		const result = assembleFixture()

		expect(result.unassignedLines.map(({ text }) => text)).toStrictEqual(['preface', '200.1.'])
		expect(result.ruleLikeTextOutsideLabelColumn).toBe(1)
	})

	test('classifies headings and malformed rule labels', () => {
		const result = assembleFixture()

		expect(result.blocks.map(({ id, heading, issues }) => ({ id, heading, issues }))).toStrictEqual([
			{ id: '100', heading: 'primary', issues: [] },
			{ id: '100.1A', heading: null, issues: ['uppercase-segment'] },
			{ id: '100.2', heading: 'secondary', issues: [] },
			{ id: '100.2.1', heading: null, issues: [] },
		])
	})

	test('uses body text size to classify mismatched heading labels', () => {
		const result = assembleRuleBlocks([
			rulePage(1, 600, [
				[textItem('100.', 20, 700, 20, 35), textItem('Game Concepts', 80, 700, 20, 130)],
				[textItem('101.', 20, 660, 8, 35), textItem('Deck Construction', 80, 660, 11, 90)],
				[textItem('102.', 20, 620, 11, 35), textItem('This remains a rule.', 80, 620, 8, 90)],
				[textItem('103.', 20, 580, 10, 35), textItem('This also remains a rule.', 80, 580, 9, 90)],
				[textItem('104.', 20, 540, 20, 35), textItem('Actions', 80, 540, 19, 90)],
				[textItem('105.', 20, 500, 10, 35), textItem('Movement', 80, 500, 19, 90)],
				[textItem('106.', 20, 460, 20, 35), textItem('Playing the Game', 80, 460, 40, 90)],
			]),
		])

		expect(
			result.blocks.map(({ id, heading, headingStyleMismatch }) => ({
				id,
				heading,
				headingStyleMismatch,
			})),
		).toStrictEqual([
			{ id: '100', heading: 'primary', headingStyleMismatch: null },
			{
				id: '101',
				heading: 'secondary',
				headingStyleMismatch: { labelFontSize: 8, bodyFontSize: 11 },
			},
			{
				id: '102',
				heading: null,
				headingStyleMismatch: { labelFontSize: 11, bodyFontSize: 8 },
			},
			{
				id: '103',
				heading: null,
				headingStyleMismatch: { labelFontSize: 10, bodyFontSize: 9 },
			},
			{
				id: '104',
				heading: 'secondary',
				headingStyleMismatch: { labelFontSize: 20, bodyFontSize: 19 },
			},
			{
				id: '105',
				heading: 'secondary',
				headingStyleMismatch: { labelFontSize: 10, bodyFontSize: 19 },
			},
			{
				id: '106',
				heading: 'primary',
				headingStyleMismatch: { labelFontSize: 20, bodyFontSize: 40 },
			},
		])
	})

	test('preserves wrapped text and source ranges across pages', () => {
		const result = assembleFixture()

		expect(result.blocks[1]).toMatchObject({
			physicalLineCount: 4,
			lines: ['First sentence. wrapped sentence.', 'See rule 200.1.', 'Example: Continued example.'],
			source: { startPage: 1, startLine: 4, endPage: 2, endLine: 1 },
		})
	})
})
