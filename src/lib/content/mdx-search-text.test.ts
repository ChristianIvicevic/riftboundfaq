import { describe, expect, test } from 'vitest'
import { stringifyMdxComponentForSearch } from '@/lib/content/mdx-search-text'
import { RUNE_NAMES, TERM_DEFINITIONS } from '@/lib/mdx-vocabulary'

type SearchNode = Parameters<typeof stringifyMdxComponentForSearch>[0]
type MdxComponentNode = Extract<SearchNode, { type: 'mdxJsxFlowElement' | 'mdxJsxTextElement' }>
type MdxAttribute = MdxComponentNode['attributes'][number]

function component(
	name: string,
	attributes: MdxAttribute[] = [],
	type: MdxComponentNode['type'] = 'mdxJsxTextElement',
): MdxComponentNode {
	return { type, name, attributes, children: [] }
}

function attribute(name: string, value: string | null): MdxAttribute {
	return { type: 'mdxJsxAttribute', name, value }
}

function expressionAttribute(name: string, value: string): MdxAttribute {
	return {
		type: 'mdxJsxAttribute',
		name,
		value: { type: 'mdxJsxAttributeValueExpression', value },
	}
}

describe('stringifyMdxComponentForSearch', () => {
	test.each(['mdxJsxTextElement', 'mdxJsxFlowElement'] as const)(
		'serializes Card names from %s nodes',
		(type) => {
			expect(
				stringifyMdxComponentForSearch(component('Card', [attribute('name', 'Hidden Blade')], type)),
			).toBe('Hidden Blade')
		},
	)

	test('serializes Energy expression values', () => {
		expect(stringifyMdxComponentForSearch(component('Energy', [expressionAttribute('value', '2')]))).toBe(
			'[2]',
		)
	})

	test.each(Object.entries(TERM_DEFINITIONS))('serializes the %s game term', (name, definition) => {
		expect(stringifyMdxComponentForSearch(component(name))).toBe(`[${definition.label}]`)

		if ('hasValue' in definition) {
			expect(stringifyMdxComponentForSearch(component(name, [expressionAttribute('value', '3')]))).toBe(
				`[${definition.label} 3]`,
			)
		}
	})

	test.each(RUNE_NAMES)('serializes the %s rune', (name) => {
		expect(stringifyMdxComponentForSearch(component(name))).toBe(`[${name}]`)
	})

	test('serializes Universal as Power', () => {
		expect(stringifyMdxComponentForSearch(component('Universal'))).toBe('[Power]')
	})

	test('ignores unrelated nodes and unsupported attributes', () => {
		expect(stringifyMdxComponentForSearch({ type: 'text', value: 'visible prose' })).toBeUndefined()
		expect(stringifyMdxComponentForSearch(component('Unknown'))).toBeUndefined()
		expect(stringifyMdxComponentForSearch(component('Card'))).toBeUndefined()
		expect(stringifyMdxComponentForSearch(component('Energy', [attribute('value', null)]))).toBeUndefined()
	})
})
