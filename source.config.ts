import { remarkFeedbackBlock, RemarkFeedbackBlockOptions } from 'fumadocs-core/mdx-plugins'
import { StructureOptions } from 'fumadocs-core/mdx-plugins/remark-structure'
import { pageSchema, metaSchema } from 'fumadocs-core/source/schema'
import { defineConfig, defineDocs } from 'fumadocs-mdx/config'
import lastModified from 'fumadocs-mdx/plugins/last-modified'
import { z } from 'zod'
import { rulingRelationsSchema } from '@/lib/ruling-relations-schema'

export const docs = defineDocs({
	dir: 'content',
	docs: {
		schema: pageSchema.extend({
			crdVersion: z.string().optional(),
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
	// Keyword components (src/components/keywords.tsx)
	Accelerate: 'Accelerate',
	Action: 'Action',
	Add: 'Add',
	Ambush: 'Ambush',
	Assault: 'Assault',
	Burn: 'Burn',
	Deathknell: 'Deathknell',
	Deflect: 'Deflect',
	Empower: 'Empower',
	Empowered: 'Empowered',
	Equip: 'Equip',
	Legion: 'Legion',
	Mighty: 'Mighty',
	Predict: 'Predict',
	QuickDraw: 'Quick-Draw',
	Reaction: 'Reaction',
	Repeat: 'Repeat',
	Shield: 'Shield',
	Stun: 'Stun',
	Temporary: 'Temporary',
	Weaponmaster: 'Weaponmaster',
	// Rune / resource components (src/components/resources.tsx)
	Universal: 'Power',
	Fury: 'Fury',
	Calm: 'Calm',
	Mind: 'Mind',
	Body: 'Body',
	Chaos: 'Chaos',
	Order: 'Order',
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
