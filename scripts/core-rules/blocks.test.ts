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
			width:
				Math.max(...items.map((item) => item.transform[4] + item.width)) -
				Math.min(...items.map(({ transform }) => transform[4])),
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
		expect(result.blocks[3].lines).toStrictEqual([{ kind: 'bullet', text: 'Resolve it.' }])
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
			lines: [
				{ kind: 'paragraph', text: 'First sentence. wrapped sentence.' },
				{ kind: 'reference', text: 'See rule 200.1.' },
				{ kind: 'example', text: 'Example: Continued example.' },
			],
			source: { startPage: 1, startLine: 4, endPage: 2, endLine: 1 },
		})
	})

	test('reconstructs short indented rows as list items', () => {
		const result = assembleRuleBlocks([
			rulePage(1, 612, [
				[textItem('123.', 20, 700, 8, 30), textItem('Game Objects include the following:', 80, 700, 8, 180)],
				[textItem('Main Deck cards', 116, 688.75, 8, 80)],
				[textItem('Runes', 116, 677.5, 8, 30)],
				[textItem('Legends', 116, 666.25, 8, 35)],
				[textItem('124.', 20, 640, 8, 30), textItem('Next rule.', 80, 640, 8, 50)],
			]),
		])

		expect(result.blocks[0]).toMatchObject({
			lines: [
				{ kind: 'paragraph', text: 'Game Objects include the following:' },
				{ kind: 'bullet', text: 'Main Deck cards' },
				{ kind: 'bullet', text: 'Runes' },
				{ kind: 'bullet', text: 'Legends' },
			],
			text: 'Game Objects include the following: Main Deck cards Runes Legends',
		})
	})

	test('preserves full-width indented continuation rows as paragraph text', () => {
		const result = assembleRuleBlocks([
			rulePage(1, 612, [
				[textItem('124.2.', 20, 700, 8, 40), textItem('Statuses include:', 80, 700, 8, 90)],
				[textItem('Attached, Attacking, Buffed, Banished, Controlled, Defending,', 116, 688.75, 8, 420)],
				[textItem('Empowered, Equipped, Exhausted, Facedown, Readied, and Stunned.', 116, 677.5, 8, 410)],
			]),
		])

		expect(result.blocks[0].lines).toStrictEqual([
			{
				kind: 'paragraph',
				text: 'Statuses include: Attached, Attacking, Buffed, Banished, Controlled, Defending, Empowered, Equipped, Exhausted, Facedown, Readied, and Stunned.',
			},
		])
	})

	test('reconstructs compact plural examples as separate examples', () => {
		const result = assembleRuleBlocks([
			rulePage(1, 612, [
				[textItem('124.1.', 20, 700, 8, 40), textItem('Modifications stop being tracked', 80, 700, 8, 180)],
				[textItem('when the object changes zones.', 80, 688.75, 8, 160)],
				[textItem('Examples:', 116, 677.5, 8, 45)],
				[textItem('Damage is cleared.', 116, 666.25, 8, 80)],
				[textItem('Counters are removed.', 116, 655, 8, 90)],
				[textItem('Statuses are cleared.', 116, 643.75, 8, 85)],
			]),
		])

		expect(result.blocks[0].lines).toStrictEqual([
			{ kind: 'paragraph', text: 'Modifications stop being tracked when the object changes zones.' },
			{ kind: 'paragraph', text: 'Examples:' },
			{ kind: 'example', text: 'Damage is cleared.' },
			{ kind: 'example', text: 'Counters are removed.' },
			{ kind: 'example', text: 'Statuses are cleared.' },
		])
	})

	test('joins wrapped rows and separates examples across page boundaries', () => {
		const result = assembleRuleBlocks([
			rulePage(1, 612, [
				[textItem('359.3.', 20, 700, 8, 40), textItem('Targeting examples follow.', 80, 700, 8, 130)],
				[textItem('Examples:', 116, 688.75, 8, 45)],
				[textItem('The first example', 116, 677.5, 8, 90)],
				[textItem('wraps here.', 116, 666.25, 8, 55)],
				[textItem('The second example continues all the way to the page edge and', 116, 643.75, 8, 400)],
			]),
			rulePage(2, 612, [
				[textItem('wraps across the page.', 116, 740, 8, 110)],
				[textItem('The third example.', 116, 717.5, 8, 90)],
			]),
			rulePage(3, 612, [
				[textItem('The fourth example starts on a new page.', 116, 740, 8, 180)],
				[textItem('360.', 20, 700, 8, 30), textItem('Next heading', 80, 700, 12, 70)],
			]),
		])

		expect(result.blocks[0].lines).toStrictEqual([
			{ kind: 'paragraph', text: 'Targeting examples follow.' },
			{ kind: 'paragraph', text: 'Examples:' },
			{ kind: 'example', text: 'The first example wraps here.' },
			{
				kind: 'example',
				text: 'The second example continues all the way to the page edge and wraps across the page.',
			},
			{ kind: 'example', text: 'The third example.' },
			{ kind: 'example', text: 'The fourth example starts on a new page.' },
		])
	})
})
