import { remarkFeedbackBlock, RemarkFeedbackBlockOptions } from 'fumadocs-core/mdx-plugins'
import { StructureOptions } from 'fumadocs-core/mdx-plugins/remark-structure'
import { pageSchema, metaSchema } from 'fumadocs-core/source/schema'
import { defineConfig, defineDocs } from 'fumadocs-mdx/config'
import lastModified from 'fumadocs-mdx/plugins/last-modified'
import { z } from 'zod'
import { rulingRelationsSchema } from '@/lib/content/ruling-relations-schema'
import { RUNE_NAMES, TERM_DEFINITIONS } from '@/lib/mdx-vocabulary'

const coreRulesVersion = z.string().regex(/^1\.\d+$/u)
const tournamentRulesVersion = z.iso.date()

export const docs = defineDocs({
	dir: 'content',
	docs: {
		schema: pageSchema.extend({
			metadataTitle: z.string().optional(),
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
			authors: z.array(z.string()).optional(),
			createdAt: z.iso.date().optional(),
			noindex: z.boolean().optional(),
			rulingRelations: rulingRelationsSchema.optional(),
		}),
	},
	meta: { schema: metaSchema },
})

// Text emitted into the search index for each custom leaf component. remarkStructure
// only serializes the raw MDX node (it never runs React), so without this these render
// as placeholder markup like `<Card name="…" />` or get dropped entirely.
const COMPONENT_SEARCH_TEXT: Record<string, string> = {
	...Object.fromEntries(
		Object.entries(TERM_DEFINITIONS).map(([name, definition]) => [name, definition.label]),
	),
	Universal: 'Power',
	...Object.fromEntries(RUNE_NAMES.map((name) => [name, name])),
}

const remarkStructureOptions: StructureOptions = {
	stringify: {
		stringify(node) {
			if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') return

			const attr = (name: string) => {
				const found = node.attributes.find((a) => a.type === 'mdxJsxAttribute' && a.name === name)
				if (!found || found.type !== 'mdxJsxAttribute') return
				// string attributes -> value; expression attributes ({0}) -> value.value
				return typeof found.value === 'string' ? found.value : found.value?.value
			}

			if (node.name === 'Card') return attr('name')
			if (node.name === 'Energy') {
				const value = attr('value')
				return value ? `[${value}]` : undefined
			}

			const text = node.name ? COMPONENT_SEARCH_TEXT[node.name] : undefined
			if (text) {
				const value = attr('value')
				return value ? `[${text} ${value}]` : `[${text}]`
			}
		},
	},
}

const feedbackBlockOptions: RemarkFeedbackBlockOptions = {
	resolve(node) {
		switch (node.type) {
			case 'mdxJsxFlowElement':
				return node.name === 'Callout' ? true : 'skip'
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
		remarkPlugins: [[remarkFeedbackBlock, feedbackBlockOptions]],
		remarkStructureOptions,
	},
})
