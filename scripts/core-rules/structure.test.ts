import { describe, expect, test } from 'vitest'
import type { RuleBlock } from './blocks'
import { structureRuleBlocks } from './structure'

function block({
	sequence,
	id,
	text,
	heading = null,
	lines = [text],
}: {
	sequence: number
	id: string
	text: string
	heading?: RuleBlock['heading']
	lines?: string[]
}): RuleBlock {
	return {
		sequence,
		id,
		label: `${id}.`,
		issues: [],
		page: 1,
		sourceLine: sequence,
		x: 20,
		y: 700 - sequence * 40,
		bodyX: 80,
		fontSize: heading === 'primary' ? 20 : heading === 'secondary' ? 12 : 8,
		heading,
		headingStyleMismatch: null,
		physicalLineCount: 1,
		sourceLines: [{ page: 1, line: sequence, x: 20, y: 700 - sequence * 40, text }],
		lines,
		text,
		source: { startPage: 1, startLine: sequence, endPage: 1, endLine: sequence },
	}
}

describe('structureRuleBlocks', () => {
	test('builds the Core Rules hierarchy with typed content', () => {
		const blocks = [
			block({ sequence: 1, id: '100', text: 'Game Concepts', heading: 'primary' }),
			block({ sequence: 2, id: '100.1', text: 'Preamble.' }),
			block({ sequence: 3, id: '100.2', text: 'Actions', heading: 'secondary' }),
			block({
				sequence: 4,
				id: '100.2.1',
				text: 'Resolve it. Example: Do this. See rule 200.1.',
				lines: ['Resolve it.', 'Example: Do this.', 'See rule 200.1.'],
			}),
			block({ sequence: 5, id: '100.2.1.a', text: '* Then finish.', lines: ['* Then finish.'] }),
		]

		const { sections, diagnostics } = structureRuleBlocks(blocks)

		expect(diagnostics).toStrictEqual([])
		expect(sections).toHaveLength(1)
		expect(sections[0].heading).toMatchObject({ id: '100', text: 'Game Concepts', level: 'primary' })
		expect(sections[0].preamble[0]).toMatchObject({
			id: '100.1',
			content: [{ kind: 'paragraph', text: 'Preamble.' }],
		})
		expect(sections[0].subsections[0].heading).toMatchObject({ id: '100.2', level: 'secondary' })
		expect(sections[0].subsections[0].rules[0]).toMatchObject({
			id: '100.2.1',
			content: [
				{ kind: 'paragraph', text: 'Resolve it.' },
				{ kind: 'example', text: 'Example: Do this.' },
				{ kind: 'reference', text: 'See rule 200.1.' },
			],
			children: [{ id: '100.2.1.a', content: [{ kind: 'bullet', text: 'Then finish.' }] }],
		})
	})

	test('reports content that precedes a primary heading', () => {
		const blocks = [
			block({ sequence: 1, id: '099.1', text: 'Orphan.' }),
			block({ sequence: 2, id: '099.2', text: 'Early heading', heading: 'secondary' }),
			block({ sequence: 3, id: '100', text: 'Game Concepts', heading: 'primary' }),
		]

		expect(structureRuleBlocks(blocks).diagnostics.map(({ code }) => code)).toStrictEqual([
			'block-before-primary-heading',
			'secondary-before-primary-heading',
		])
	})
})
