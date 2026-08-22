import { describe, expect, test } from 'vitest'
import { remarkRulingCrossReferences } from '@/lib/content/remark-ruling-cross-references'

describe('remarkRulingCrossReferences', () => {
	test('places one reference component after each complete H2 answer', () => {
		const tree = {
			type: 'root',
			children: [
				{ type: 'heading', depth: 2, data: { hProperties: { id: 'first-answer' } }, children: [] },
				{ type: 'paragraph', children: [{ type: 'text', value: 'First answer.' }] },
				{ type: 'heading', depth: 3, data: { hProperties: { id: 'supporting' } }, children: [] },
				{ type: 'paragraph', children: [{ type: 'text', value: 'Supporting material.' }] },
				{ type: 'heading', depth: 2, data: { hProperties: { id: 'second-answer' } }, children: [] },
				{ type: 'paragraph', children: [{ type: 'text', value: 'Second answer.' }] },
			],
		}

		remarkRulingCrossReferences()(tree)

		expect(tree.children.map((node) => node.type)).toStrictEqual([
			'heading',
			'paragraph',
			'heading',
			'paragraph',
			'mdxJsxFlowElement',
			'heading',
			'paragraph',
			'mdxJsxFlowElement',
		])
		expect(tree.children[4]).toMatchObject({
			type: 'mdxJsxFlowElement',
			name: 'RulingCrossReferences',
			attributes: [{ type: 'mdxJsxAttribute', name: 'anchor', value: 'first-answer' }],
		})
		expect(tree.children[7]).toMatchObject({
			type: 'mdxJsxFlowElement',
			name: 'RulingCrossReferences',
			attributes: [{ type: 'mdxJsxAttribute', name: 'anchor', value: 'second-answer' }],
		})
	})

	test.each([
		{
			name: 'an authored duplicate mount',
			children: [
				{ type: 'heading', depth: 2, data: { hProperties: { id: 'answer' } }, children: [] },
				{
					type: 'mdxJsxFlowElement',
					name: 'RulingCrossReferences',
					attributes: [{ type: 'mdxJsxAttribute', name: 'anchor', value: 'answer' }],
					children: [],
				},
			],
		},
		{
			name: 'an orphan mount',
			children: [
				{
					type: 'mdxJsxFlowElement',
					name: 'RulingCrossReferences',
					attributes: [{ type: 'mdxJsxAttribute', name: 'anchor', value: 'missing' }],
					children: [],
				},
			],
		},
		{
			name: 'a nested mount',
			children: [
				{
					type: 'mdxJsxFlowElement',
					name: 'Callout',
					children: [
						{
							type: 'mdxJsxFlowElement',
							name: 'RulingCrossReferences',
							attributes: [{ type: 'mdxJsxAttribute', name: 'anchor', value: 'answer' }],
							children: [],
						},
					],
				},
			],
		},
		{
			name: 'an inline mount',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'mdxJsxTextElement', name: 'RulingCrossReferences', children: [] }],
				},
			],
		},
	])('rejects $name', ({ children }) => {
		expect(() => remarkRulingCrossReferences()({ children })).toThrow(
			/RulingCrossReferences mounts are generated and must not be authored/u,
		)
	})

	test('rejects duplicate answer anchors instead of generating duplicate mounts', () => {
		const tree = {
			type: 'root',
			children: [
				{ type: 'heading', depth: 2, data: { hProperties: { id: 'answer' } }, children: [] },
				{ type: 'paragraph', children: [] },
				{ type: 'heading', depth: 2, data: { hProperties: { id: 'answer' } }, children: [] },
				{ type: 'paragraph', children: [] },
			],
		}

		expect(() => remarkRulingCrossReferences()(tree)).toThrow(/duplicate H2 Ruling answer anchor answer/u)
	})
})
