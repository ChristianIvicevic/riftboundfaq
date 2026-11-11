import { Result } from 'effect'
import { describe, expect, it } from 'vitest'
import type { PdfTextItem } from '../lines'
import {
	appendTournamentRulesSourcePage,
	createTournamentRulesSourceRowsAccumulator,
	finishTournamentRulesSourceRows,
	TournamentRulesSourceRowReconstructionError,
	type TournamentRulesSourcePage,
} from './source-rows'

function textItem(str: string, x: number, y: number, fontSize = 8): PdfTextItem {
	return { str, transform: [fontSize, 0, 0, fontSize, x, y], width: str.length * 4, height: fontSize }
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

function reconstructPages(...pages: TournamentRulesSourcePage[]) {
	return Result.gen(function* () {
		let accumulator = createTournamentRulesSourceRowsAccumulator()
		for (const page of pages) {
			accumulator = yield* appendTournamentRulesSourcePage(accumulator, page)
		}
		return finishTournamentRulesSourceRows(accumulator)
	})
}

function reconstruct(...pages: TournamentRulesSourcePage[]) {
	return Result.getOrThrow(reconstructPages(...pages))
}

describe('Tournament Rules source rows', () => {
	it('accumulates one page as pure data', () => {
		const page = sourcePage([textItem('100.1.', 40, 150), textItem('A tournament rule.', 130, 150)])
		const accumulated = Result.getOrThrow(
			appendTournamentRulesSourcePage(createTournamentRulesSourceRowsAccumulator(), page),
		)

		expect(finishTournamentRulesSourceRows(accumulated).sourceEntries).toMatchObject([
			{ sequence: 1, label: { id: '100.1' }, text: 'A tournament rule.' },
		])
	})

	it('reconstructs a labeled table row for source-entry and forensic callers', () => {
		const result = reconstruct(
			sourcePage([textItem('100.1.', 40, 150), textItem('A tournament rule.', 130, 150)]),
		)

		expect(result.sourceEntries).toStrictEqual([
			{
				sequence: 1,
				label: { sourceText: '100.1.', id: '100.1', text: '100.1.', normalization: 'unchanged' },
				text: 'A tournament rule.',
				kind: 'rule',
				nestingDepth: 0,
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

	it('records the semantic nesting depth of each source entry', () => {
		const result = reconstruct(
			sourcePage([textItem('100.1.a.', 40, 150), textItem('A nested rule.', 238.5, 150)]),
		)

		expect(result.sourceEntries[0]).toMatchObject({ nestingDepth: 3 })
	})

	it.each([
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
	])('preserves normalized evidence for a $case', ({ sourceText, expected }) => {
		const result = reconstruct(sourcePage([textItem(sourceText, 40, 150), textItem('Rule text.', 130, 150)]))

		expect(result.sourceEntries[0].label).toStrictEqual(expected)
	})

	it('splits multiple labels in one table interval and classifies their typography', () => {
		const result = reconstruct(
			sourcePage([
				textItem('100.', 40, 170, 20),
				textItem('Tournament Operations', 130, 170, 20),
				textItem('100.1.', 40, 130),
				textItem('A tournament rule.', 130, 130),
			]),
		)

		expect(result.sourceEntries).toMatchObject([
			{ sequence: 1, kind: 'primary-heading', text: 'Tournament Operations' },
			{ sequence: 2, kind: 'rule', text: 'A tournament rule.' },
		])
	})

	it.each([
		{ case: 'complete strikeout', x: 35, width: 200, coverage: 'complete', text: '100.1. Rule text.' },
		{ case: 'partial strikeout', x: 130, width: 40, coverage: 'partial', text: 'Rule text.' },
	])('normalizes $case evidence', ({ x, width, coverage, text }) => {
		const page = sourcePage([textItem('100.1.', 40, 150), textItem('Rule text.', 130, 150)])
		page.drawings.horizontalStrokes.push({ x, y: 154, width, height: 0.5, lineWidth: 1 })

		const result = reconstruct(page)

		expect(result.sourceEntries[0].activity).toStrictEqual({
			status: 'removed',
			removalEvidence: { text, coverage },
		})
	})

	it('joins an unlabeled first row to the previous page without leaking continuation geometry', () => {
		const result = reconstruct(
			sourcePage([textItem('100.1.', 40, 150), textItem('Text before the break', 130, 150)]),
			sourcePage([textItem('and after it.', 130, 150)], 2),
		)

		expect(result.sourceEntries).toStrictEqual([
			{
				sequence: 1,
				label: { sourceText: '100.1.', id: '100.1', text: '100.1.', normalization: 'unchanged' },
				text: 'Text before the break and after it.',
				kind: 'rule',
				nestingDepth: 0,
				activity: { status: 'active', removalEvidence: null },
				sourcePages: { start: 1, end: 2 },
			},
		])
		expect(result.forensicRows[0]).toMatchObject({
			continuation: true,
			source: { startPage: 1, endPage: 2 },
		})
		expect(result.forensicRows[0].geometry.continuationRows).toHaveLength(1)
	})

	it('keeps highlighting forensic while classifying secondary headings', () => {
		const page = sourcePage([
			textItem('100.1.', 40, 150, 10),
			textItem('Player Responsibilities', 130, 150, 10),
		])
		page.drawings.yellowFills.push({ x: 35, y: 145, width: 300, height: 15 })

		const result = reconstruct(page)

		expect(result.sourceEntries[0]).toMatchObject({
			kind: 'secondary-heading',
			activity: { status: 'active' },
		})
		expect(result.forensicRows[0].highlighted).toBe(true)
	})

	it('represents a page without a recognized table as an empty result', () => {
		const page = sourcePage([textItem('Outside a table.', 130, 150)])
		page.drawings.tableLines = []

		expect(reconstruct(page)).toStrictEqual({ sourceEntries: [], forensicRows: [] })
	})

	it.each([
		{ pages: [sourcePage([], 0)], code: 'invalid-page-number' },
		{ pages: [sourcePage([], 1), sourcePage([], 3)], code: 'noncontiguous-page-order' },
	])('rejects source-page contract violations with $code', ({ pages, code }) => {
		const result = reconstructPages(...pages)

		expect(Result.isFailure(result)).toBe(true)
		if (!Result.isFailure(result)) throw new Error('Expected source row reconstruction to fail')
		expect(result.failure).toBeInstanceOf(TournamentRulesSourceRowReconstructionError)
		expect(result.failure['_tag']).toBe('TournamentRulesSourceRowReconstructionError')
		expect(result.failure.code).toBe(code)
	})
})
