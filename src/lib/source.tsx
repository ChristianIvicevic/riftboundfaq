import { type InferPageType, loader } from 'fumadocs-core/source'
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons'
import { docs } from 'fumadocs-mdx:collections/server'
import { Badge } from '@/components/ui/badge'
import { buildRulingRelationIndex, getRulingRelations } from '@/lib/ruling-relations'

const NEW_PAGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000
const BUILD_TIMESTAMP = Date.now()

function isNewPage(createdAt?: string) {
	if (!createdAt) return false
	const age = BUILD_TIMESTAMP - Date.parse(createdAt)
	return age >= 0 && age < NEW_PAGE_WINDOW_MS
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

const rulingRelationIndex = buildRulingRelationIndex(source.getPages())

export function getPageRulingRelations(pageUrl: string) {
	return getRulingRelations(rulingRelationIndex, pageUrl)
}

export function getPageImage(page: InferPageType<typeof source>) {
	const segments = [...page.slugs, 'image.png']
	return { segments, url: `/og/${segments.join('/')}` }
}
