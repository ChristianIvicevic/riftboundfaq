import { remarkBlockId, type RemarkBlockIdOptions } from 'fumadocs-core/mdx-plugins/remark-block-id'
import { StructureOptions } from 'fumadocs-core/mdx-plugins/remark-structure'
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema'
import { defineConfig, defineDocs } from 'fumadocs-mdx/config'
import lastModified from 'fumadocs-mdx/plugins/last-modified'
import { z } from 'zod'
import { author } from '@/lib/content/author'
import { RUNE_NAMES, TERM_DEFINITIONS } from '@/lib/mdx-vocabulary'
import { coreRulesConventions, tournamentRulesConventions } from '@/lib/rules/document-family-conventions'

const coreRulesVersion = z.string().refine(coreRulesConventions.isVersion)
const tournamentRulesVersion = z.string().refine(tournamentRulesConventions.isVersion)

export const docs = defineDocs({
	dir: 'content',
	docs: {
		schema: pageSchema.extend({
			sidebarTitle: z.string().optional(),
			reviewedCoreRulesVersion: coreRulesVersion.optional(),
			rulesDocument: z
				.discriminatedUnion('type', [
					z.object({
						type: z.literal('core-rules'),
						version: coreRulesVersion,
					}),
					z.object({
						type: z.literal('tournament-rules'),
						version: tournamentRulesVersion,
					}),
				])
				.optional(),
			galleryLink: z.url().optional(),
			authors: z.array(author).optional(),
			createdAt: z.iso.date().optional(),
			noindex: z.boolean().optional(),
		}),
	},
	meta: { schema: metaSchema },
})

// Text emitted into the search index for each custom leaf component. remarkStructure
// only serializes the raw MDX node (it never runs React), so without this these render
// as placeholder markup like `<Card name="…" />` or get dropped entirely.
const COMPONENT_SEARCH_TEXT = new Map<string, string>([
	...Object.entries(TERM_DEFINITIONS).map(([name, definition]) => [name, definition.label] as const),
	['Universal', 'Power'],
	...RUNE_NAMES.map((name) => [name, name] as const),
])

const remarkStructureOptions: StructureOptions = {
	stringify: {
		stringify(node) {
			if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') return

			const attr = (name: string) => {
				const found = node.attributes.find((a) => a.type === 'mdxJsxAttribute' && a.name === name)
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
		},
	},
}

const blockIdOptions: RemarkBlockIdOptions = {
	addDataAttribute: 'feedback',
	shouldGenerate(node) {
		switch (node.type) {
			case 'mdxJsxFlowElement':
				return node.name === 'Callout' || node.name === 'Steps' || node.name === 'Step' ? true : 'skip'
			case 'paragraph':
			case 'image':
			case 'listItem':
				return true
			default:
				return false
		}
	},
}

export default defineConfig({
	plugins: [lastModified()],
	mdxOptions: {
		remarkPlugins: [[remarkBlockId, blockIdOptions]],
		remarkStructureOptions,
	},
})
