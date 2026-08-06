import { describe, expect, test } from 'vitest'
import { segmentRulesExampleText } from '@/lib/rules/example-text'

describe('segmentRulesExampleText', () => {
	test('identifies a registered card without changing surrounding text', () => {
		expect(segmentRulesExampleText('Example: Loose Cannon has the tag Jinx.', [])).toStrictEqual([
			{ kind: 'text', text: 'Example: ' },
			{ kind: 'card', name: 'Loose Cannon', text: 'Loose Cannon' },
			{ kind: 'text', text: ' has the tag Jinx.' },
		])
	})

	test('matches complete card names containing PDF apostrophes', () => {
		expect(
			segmentRulesExampleText('Example: Kai’Sa, Evolutionary and Kai’Sa, Survivor share a short name.', []),
		).toStrictEqual([
			{ kind: 'text', text: 'Example: ' },
			{ kind: 'card', name: "Kai'Sa, Evolutionary", text: 'Kai’Sa, Evolutionary' },
			{ kind: 'text', text: ' and ' },
			{ kind: 'card', name: "Kai'Sa, Survivor", text: 'Kai’Sa, Survivor' },
			{ kind: 'text', text: ' share a short name.' },
		])
	})

	test.each([
		{ case: 'a partial card name', text: 'Loose Cannons' },
		{ case: 'a case-insensitive card name', text: 'loose cannon' },
	])('ignores $case', ({ text }) => {
		expect(segmentRulesExampleText(text, [])).toStrictEqual([{ kind: 'text', text }])
	})

	test('preserves rule references alongside card names', () => {
		const text = 'Example: Traveling Merchant is legal. See rule 601.2.'
		expect(segmentRulesExampleText(text, [{ id: '601.2', start: 42, end: 52 }])).toStrictEqual([
			{ kind: 'text', text: 'Example: ' },
			{ kind: 'card', name: 'Traveling Merchant', text: 'Traveling Merchant' },
			{ kind: 'text', text: ' is legal. See ' },
			{ kind: 'rule-reference', id: '601.2', text: 'rule 601.2' },
			{ kind: 'text', text: '.' },
		])
	})
})
