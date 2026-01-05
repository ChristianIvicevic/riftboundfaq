import { defineConfig, defineDocs, frontmatterSchema } from 'fumadocs-mdx/config'
import { z } from 'zod'

export const docs = defineDocs({
	dir: 'content',
	docs: { schema: frontmatterSchema.extend({ crdVersion: z.string().optional() }) },
})
export default defineConfig()
