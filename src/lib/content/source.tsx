import { loader } from 'fumadocs-core/source'
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons'
import { docs } from 'fumadocs-mdx:collections/server'
import { getGameTermComponentByLabel } from '@/components/game-terms'
import { StatusBadge } from '@/components/ui/status-badge'
import { RULING_PATH_PREFIXES } from '@/lib/content/ruling-routes'

const NEW_PAGE_WINDOW_MS = 21 * 24 * 60 * 60 * 1000
const BUILD_TIMESTAMP = Date.now()

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
					if (!content || content.format !== 'page') return node
					const sidebarTitle = content.data.sidebarTitle
					const GameTerm = node.url.startsWith(RULING_PATH_PREFIXES.mechanics)
						? getGameTermComponentByLabel(sidebarTitle ?? content.data.title)
						: undefined
					node.name = GameTerm ? <GameTerm /> : (sidebarTitle ?? node.name)
					if (isNewPage(content.data.createdAt))
						node.name = (
							<div key={content.path} className="flex w-full items-center gap-3">
								<span className="flex-1">{node.name}</span>
								<StatusBadge tone="info">New</StatusBadge>
							</div>
						)
					return node
				},
			},
		}),
	],
})
