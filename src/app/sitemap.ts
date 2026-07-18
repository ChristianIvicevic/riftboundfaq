import type { MetadataRoute } from 'next'
import { baseUrl } from '@/lib/metadata'
import { source } from '@/lib/source'

function buildUrl(path: string): string {
	return new URL(path, baseUrl).toString()
}

export default function sitemap(): MetadataRoute.Sitemap {
	return source
		.getPages()
		.filter((page) => !page.data.noindex)
		.map((page): MetadataRoute.Sitemap[number] => ({
			url: buildUrl(page.url),
			lastModified: page.data.lastModified,
			changeFrequency: 'weekly',
			priority: page.url === '/' ? 1 : 0.8,
		}))
}
