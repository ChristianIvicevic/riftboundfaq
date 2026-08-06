import { describe, expect, test } from 'vitest'
import { assembleRuleBlocks, type RulePage } from './blocks.ts'
import type { PdfTextItem } from './lines.ts'
import { structureRuleBlocks } from './structure.ts'

function textItem(str: string, x: number, y: number, size = 8, width = str.length * 4): PdfTextItem {
	return { str, transform: [size, 0, 0, size, x, y], width, height: size }
}

function rulePage(rows: PdfTextItem[][]): RulePage {
	return {
		page: 1,
		width: 600,
		lines: rows.map((items, index) => ({
			page: 1,
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

describe('Core Rules parser pipeline', () => {
	test('structures assembled blocks without changing their hierarchy or content kinds', () => {
		const { blocks } = assembleRuleBlocks([
			rulePage([
				[textItem('100.', 20, 700, 20, 35), textItem('Game Concepts', 80, 700, 20, 130)],
				[textItem('100.1.', 20, 660, 8, 35), textItem('Preamble.', 80, 660, 8, 50)],
				[textItem('100.2.', 20, 620, 12, 35), textItem('Actions', 80, 620, 12, 45)],
				[textItem('100.2.1.', 20, 580, 8, 45), textItem('Example: Do this.', 80, 580, 8, 90)],
			]),
		])

		const { sections, diagnostics } = structureRuleBlocks(blocks)

		expect(diagnostics).toStrictEqual([])
		expect(sections).toMatchObject([
			{
				heading: { id: '100', text: 'Game Concepts', level: 'primary' },
				preamble: [{ id: '100.1', content: [{ kind: 'paragraph', text: 'Preamble.' }] }],
				subsections: [
					{
						heading: { id: '100.2', text: 'Actions', level: 'secondary' },
						rules: [{ id: '100.2.1', content: [{ kind: 'example', text: 'Example: Do this.' }] }],
					},
				],
			},
		])
	})
})
