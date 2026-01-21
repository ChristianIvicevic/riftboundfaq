import { defineConfig, defineDocs, frontmatterSchema, metaSchema } from 'fumadocs-mdx/config'
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

export default defineConfig()
