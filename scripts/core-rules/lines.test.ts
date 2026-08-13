import { describe, expect, test } from 'vitest'
import { reconstructPhysicalLines, reconstructText, type PdfTextItem } from './lines'

function textItem(str: string, x: number, y: number, size = 8, width = str.length * 4): PdfTextItem {
	return { str, transform: [size, 0, 0, size, x, y], width, height: size }
}

describe('reconstructText', () => {
	test.each([
		{
			case: 'sorts fragments and preserves explicit spaces',
			items: [textItem('Rules', 58, 100), textItem('Core', 10, 100), textItem(' ', 50, 100, 8, 4)],
			expected: 'Core Rules',
		},
		{
			case: 'inserts spaces between geometrically separated fragments',
			items: [textItem('Alpha', 10, 100, 8, 20), textItem('Beta', 31, 100, 8, 16)],
			expected: 'Alpha Beta',
		},
		{
			case: 'joins fragments without a geometric gap',
			items: [textItem('Alpha', 10, 100, 8, 20), textItem('Beta', 30.5, 100, 8, 16)],
			expected: 'AlphaBeta',
		},
	])('$case', ({ items, expected }) => {
		expect(reconstructText(items)).toBe(expected)
	})
})

describe('reconstructPhysicalLines', () => {
	test('groups mixed font sizes by top edge while preserving reading order', () => {
		const lines = reconstructPhysicalLines(
			[
				textItem('second', 10, 80),
				textItem('Heading', 30, 90, 20, 50),
				textItem('100.', 10, 100, 10, 18),
				{ type: 'marked-content' },
			],
			2,
		)

		expect(lines.map(({ page, line, text }) => ({ page, line, text }))).toStrictEqual([
			{ page: 2, line: 1, text: '100. Heading' },
			{ page: 2, line: 2, text: 'second' },
		])
	})

	test('ignores malformed text-like PDF items', () => {
		const lines = reconstructPhysicalLines(
			[
				{ str: 'missing geometry' },
				{ str: 'valid', transform: [10, 0, 0, 10, 20, 100], width: 20, height: 10 },
			],
			3,
		)

		expect(lines).toMatchObject([{ page: 3, line: 1, text: 'valid' }])
	})
})
