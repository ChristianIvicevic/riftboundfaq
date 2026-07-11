import { type InferPageType, loader } from 'fumadocs-core/source'
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons'
import { docs } from 'fumadocs-mdx:collections/server'
import { Badge } from '@/components/ui/badge'

export const source = loader({
	baseUrl: '/',
	source: docs.toFumadocsSource(),
	plugins: ({ typedPlugin }) => [
		lucideIconsPlugin(),
		typedPlugin({
			transformPageTree: {
				file(node, file) {
					if (!file) return node
					const content = this.storage.read(file) as { data?: { isNew?: boolean } }
					if (content?.data?.isNew)
						node.name = (
							<>
								<Badge>New</Badge> {node.name}
							</>
						)
					return node
				},
			},
		}),
	],
})

export function getPageImage(page: InferPageType<typeof source>) {
	const segments = [...page.slugs, 'image.png']
	return { segments, url: `/og/${segments.join('/')}` }
}
