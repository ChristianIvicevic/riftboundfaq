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
					const content = this.storage.read(file)
					if (content && content.format === 'page' && content.data.isNew)
						node.name = (
							<div key={content.path} className="flex w-full items-center gap-2">
								<span className="flex-1">{node.name}</span>
								<Badge>New</Badge>
							</div>
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
