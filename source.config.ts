import { remarkBlockId, type RemarkBlockIdOptions } from 'fumadocs-core/mdx-plugins/remark-block-id'
import type { StructureOptions } from 'fumadocs-core/mdx-plugins/remark-structure'
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema'
import { defineConfig, defineDocs } from 'fumadocs-mdx/config'
import lastModified from 'fumadocs-mdx/plugins/last-modified'
import { z } from 'zod'
import { author } from '@/lib/content/author'
import { stringifyMdxComponentForSearch } from '@/lib/content/mdx-search-text'
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
			authors: z.array(author).optional(),
			createdAt: z.iso.date().optional(),
			noindex: z.boolean().optional(),
		}),
	},
	meta: { schema: metaSchema },
})

const remarkStructureOptions: StructureOptions = {
	stringify: {
		// remarkStructure serializes the MDX AST rather than rendered React output.
		stringify: stringifyMdxComponentForSearch,
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
