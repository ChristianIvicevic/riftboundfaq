import { describe, expect, test } from 'vitest'
import type { PdfTextItem } from '../core-rules/lines'
import { reconstructTournamentRulesSourceRows, type TournamentRulesSourcePage } from './source-rows'

function textItem(str: string, x: number, y: number, fontSize = 8): PdfTextItem {
	return { str, transform: [fontSize, 0, 0, fontSize, x, y], width: str.length * 4, height: fontSize }
}

async function* pages(...values: TournamentRulesSourcePage[]) {
	yield* values
}

function sourcePage(items: PdfTextItem[], page = 1): TournamentRulesSourcePage {
	return {
		page,
		items,
		drawings: {
			horizontalStrokes: [],
			yellowFills: [],
			tableLines: [
				{ x: 36, y: 200, width: 539, height: 1 },
				{ x: 36, y: 100, width: 539, height: 1 },
			],
		},
	}
}

describe('reconstructTournamentRulesSourceRows', () => {
	test('interprets a labeled table row for source and forensic callers', async () => {
		const result = await reconstructTournamentRulesSourceRows(
			pages(sourcePage([textItem('100.1.', 40, 150), textItem('A tournament rule.', 130, 150)])),
		)

		expect(result.sourceRows).toStrictEqual([
			{
				sequence: 1,
				label: { sourceText: '100.1.', id: '100.1', text: '100.1.', normalization: 'unchanged' },
				text: 'A tournament rule.',
				kind: 'rule',
				activity: { status: 'active', removalEvidence: null },
				sourcePages: { start: 1, end: 1 },
			},
		])
		expect(result.forensicRows).toMatchObject([
			{
				sequence: 1,
				page: 1,
				rawLabel: '100.1.',
				id: '100.1',
				label: '100.1.',
				text: 'A tournament rule.',
				active: true,
			},
		])
	})

	test.each([
		{
			case: 'missing period',
			sourceText: '100.1',
			expected: { sourceText: '100.1', id: '100.1', text: '100.1.', normalization: 'added-period' },
		},
		{
			case: 'malformed label',
			sourceText: '100.A.',
			expected: { sourceText: '100.A.', id: null, text: '100.A.', normalization: 'malformed' },
		},
	])('preserves normalized evidence for a $case', async ({ sourceText, expected }) => {
		const result = await reconstructTournamentRulesSourceRows(
			pages(sourcePage([textItem(sourceText, 40, 150), textItem('Rule text.', 130, 150)])),
		)

		expect(result.sourceRows[0].label).toStrictEqual(expected)
	})

	test('splits multiple labels in one table interval and classifies their typography', async () => {
		const result = await reconstructTournamentRulesSourceRows(
			pages(
				sourcePage([
					textItem('100.', 40, 170, 20),
					textItem('Tournament Operations', 130, 170, 20),
					textItem('100.1.', 40, 130),
					textItem('A tournament rule.', 130, 130),
				]),
			),
		)

		expect(result.sourceRows).toMatchObject([
			{ sequence: 1, kind: 'primary-heading', text: 'Tournament Operations' },
			{ sequence: 2, kind: 'rule', text: 'A tournament rule.' },
		])
	})

	test.each([
		{ case: 'complete strikeout', x: 35, width: 200, coverage: 'complete', text: '100.1. Rule text.' },
		{ case: 'partial strikeout', x: 130, width: 40, coverage: 'partial', text: 'Rule text.' },
	])('normalizes $case evidence', async ({ x, width, coverage, text }) => {
		const page = sourcePage([textItem('100.1.', 40, 150), textItem('Rule text.', 130, 150)])
		page.drawings.horizontalStrokes.push({ x, y: 154, width, height: 0.5, lineWidth: 1 })

		const result = await reconstructTournamentRulesSourceRows(pages(page))

		expect(result.sourceRows[0].activity).toStrictEqual({
			status: 'removed',
			removalEvidence: { text, coverage },
		})
	})

	test('joins an unlabeled first row to the previous page without leaking continuation geometry', async () => {
		const result = await reconstructTournamentRulesSourceRows(
			pages(
				sourcePage([textItem('100.1.', 40, 150), textItem('Text before the break', 130, 150)]),
				sourcePage([textItem('and after it.', 130, 150)], 2),
			),
		)

		expect(result.sourceRows).toStrictEqual([
			{
				sequence: 1,
				label: { sourceText: '100.1.', id: '100.1', text: '100.1.', normalization: 'unchanged' },
				text: 'Text before the break and after it.',
				kind: 'rule',
				activity: { status: 'active', removalEvidence: null },
				sourcePages: { start: 1, end: 2 },
			},
		])
		expect(result.forensicRows[0]).toMatchObject({ continuation: true, source: { startPage: 1, endPage: 2 } })
		expect(result.forensicRows[0].geometry.continuationRows).toHaveLength(1)
	})

	test('keeps highlighting forensic while classifying secondary headings', async () => {
		const page = sourcePage([
			textItem('100.1.', 40, 150, 10),
			textItem('Player Responsibilities', 130, 150, 10),
		])
		page.drawings.yellowFills.push({ x: 35, y: 145, width: 300, height: 15 })

		const result = await reconstructTournamentRulesSourceRows(pages(page))

		expect(result.sourceRows[0]).toMatchObject({ kind: 'secondary-heading', activity: { status: 'active' } })
		expect(result.forensicRows[0].highlighted).toBe(true)
	})

	test('represents a page without a recognized table as an empty result', async () => {
		const page = sourcePage([textItem('Outside a table.', 130, 150)])
		page.drawings.tableLines = []

		const result = await reconstructTournamentRulesSourceRows(pages(page))

		expect(result).toStrictEqual({ sourceRows: [], forensicRows: [] })
	})

	test.each([
		{ pages: [sourcePage([], 0)], code: 'invalid-page-number' },
		{ pages: [sourcePage([], 1), sourcePage([], 3)], code: 'noncontiguous-page-order' },
	])('rejects source-page contract violations with $code', async ({ pages: values, code }) => {
		const reconstruction = reconstructTournamentRulesSourceRows(pages(...values))

		await expect(reconstruction).rejects.toMatchObject({ code })
	})
})
