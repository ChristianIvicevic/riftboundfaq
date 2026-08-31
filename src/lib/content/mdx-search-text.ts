import type { StringifyOptions } from 'fumadocs-core/mdx-plugins/remark-structure'
import { z } from 'zod'
import { RUNE_NAMES, TERM_DEFINITIONS } from '@/lib/mdx-vocabulary'

const COMPONENT_SEARCH_TEXT = new Map<string, string>([
	...Object.entries(TERM_DEFINITIONS).map(([name, definition]) => [name, definition.label] as const),
	['Universal', 'Power'],
	...RUNE_NAMES.map((name) => [name, name] as const),
])

type SearchNode = Parameters<NonNullable<StringifyOptions['stringify']>>[0]

export function stringifyMdxComponentForSearch(node: SearchNode) {
	if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') return

	const attr = (name: string) => {
		const found = node.attributes.find(
			(attribute) => attribute.type === 'mdxJsxAttribute' && attribute.name === name,
		)
		if (!found || found.type !== 'mdxJsxAttribute') return
		const attributeValue = z
			.union([z.string(), z.object({ value: z.string() }).transform(({ value }) => value)])
			.safeParse(found.value)
		return attributeValue.success ? attributeValue.data : undefined
	}

	if (node.name === 'Card') return attr('name')
	if (node.name === 'Energy') {
		const value = attr('value')
		return value ? `[${value}]` : undefined
	}

	const text = node.name ? COMPONENT_SEARCH_TEXT.get(node.name) : undefined
	if (text) {
		const value = attr('value')
		return value ? `[${text} ${value}]` : `[${text}]`
	}
}
