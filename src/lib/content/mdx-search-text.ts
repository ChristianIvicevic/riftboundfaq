import type { StructureOptions } from 'fumadocs-core/mdx-plugins/remark-structure'
import { replaceSource } from 'fumadocs-core/mdx-plugins/stringifier'
import { z } from 'zod'
import { RUNE_NAMES, TERM_DEFINITIONS } from '@/lib/mdx-vocabulary'

const COMPONENT_SEARCH_TEXT = new Map<string, string>([
	...Object.entries(TERM_DEFINITIONS).map(([name, definition]) => [name, definition.label] as const),
	['Universal', 'Power'],
	...RUNE_NAMES.map((name) => [name, name] as const),
])

type SearchNode = Parameters<typeof replaceSource>[1]
type SearchFile = Parameters<typeof replaceSource>[0]
type MdxComponentNode = Parameters<NonNullable<StructureOptions['filterElement']>>[0]

function isMdxComponent(node: SearchNode): node is MdxComponentNode {
	return node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement'
}

export function stringifyMdxComponentForSearch(node: SearchNode) {
	if (!isMdxComponent(node)) return

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

export function remarkMdxSearchText() {
	return (tree: SearchNode, file: SearchFile) => {
		const visit = (node: SearchNode) => {
			if (node.type === 'paragraph') {
				const replacements: { node: MdxComponentNode; text: string }[] = []
				const collect = (child: SearchNode) => {
					const text = stringifyMdxComponentForSearch(child)
					if (text !== undefined && isMdxComponent(child)) {
						replacements.push({ node: child, text })
						return
					}
					if ('children' in child) child.children.forEach(collect)
				}
				node.children.forEach(collect)

				if (replacements.length > 0) {
					// Remark Structure replaces JSX nodes itself, so replace their enclosing record instead.
					replaceSource(
						file,
						node,
						(stringifier) => {
							const paragraph = stringifier.range(node)
							if (!paragraph) return ''

							let cursor = paragraph.start
							let result = ''
							for (const replacement of replacements) {
								const range = stringifier.range(replacement.node)
								if (!range) continue
								result += stringifier.slice(cursor, range.start) + replacement.text
								cursor = range.end
							}
							return result + stringifier.slice(cursor, paragraph.end)
						},
						'search',
					)
				}
				return
			}

			if (!('children' in node)) return
			for (const child of node.children) {
				const text = node.type === 'root' ? stringifyMdxComponentForSearch(child) : undefined
				if (text === undefined) {
					visit(child)
				} else {
					// Standalone flow elements have no paragraph to replace.
					child.data ??= {}
					child.data.structuredData = { contents: [{ heading: undefined, content: text }] }
				}
			}
		}

		visit(tree)
	}
}
