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
})
