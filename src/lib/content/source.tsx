import { loader } from 'fumadocs-core/source'
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons'
import { docs } from 'fumadocs-mdx:collections/server'
import { Badge } from '@/components/ui/badge'

const NEW_PAGE_WINDOW_MS = 21 * 24 * 60 * 60 * 1000
const BUILD_TIMESTAMP = Date.now()

export const PAGE_IMAGE_SIZE = { width: 1200, height: 630 } as const

function isNewPage(createdAt?: string) {
	if (!createdAt) return false
	const age = BUILD_TIMESTAMP - Date.parse(createdAt)
	return age < NEW_PAGE_WINDOW_MS
}

export const source = loader({
	baseUrl: '/',
	source: docs.toFumadocsSource(),
	// Nav is curated explicitly via meta.json, so don't auto-append pages omitted from the sidebar.
	pageTree: { generateFallback: false },
	plugins: ({ typedPlugin }) => [
		lucideIconsPlugin(),
		typedPlugin({
			transformPageTree: {
				file(node, file) {
					if (!file) return node
					const content = this.storage.read(file)
					if (content && content.format === 'page' && isNewPage(content.data.createdAt))
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

type ContentPage = ReturnType<typeof source.getPages>[number]

export function isIndexablePage(page: ContentPage) {
	return !page.data.noindex
}

export function getPageImage(page: Pick<ContentPage, 'slugs'>) {
	const segments = [...page.slugs, 'image.png']
	return { segments, url: `/og/${segments.join('/')}?v=2` }
}
