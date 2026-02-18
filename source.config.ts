import { remarkFeedbackBlock, RemarkFeedbackBlockOptions } from 'fumadocs-core/mdx-plugins'
import { defineConfig, defineDocs, frontmatterSchema, metaSchema } from 'fumadocs-mdx/config'
import lastModified from 'fumadocs-mdx/plugins/last-modified'
import { z } from 'zod'

export const docs = defineDocs({
	dir: 'content',
	docs: {
		schema: frontmatterSchema.extend({
			crdVersion: z.string().optional(),
			galleryLink: z.url().optional(),
			authors: z.array(z.string()).optional(),
		}),
	},
	meta: { schema: metaSchema },
})

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
	mdxOptions: { remarkPlugins: [[remarkFeedbackBlock, feedbackBlockOptions]] },
})
