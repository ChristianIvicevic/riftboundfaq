import type { MetadataRoute } from 'next'
import { getPagePublication } from '@/lib/content/page-publication'
import { source } from '@/lib/content/source'
import { SITE_URL } from '@/lib/site'

function buildUrl(path: string): string {
	return new URL(path, SITE_URL).toString()
}

export default function sitemap(): MetadataRoute.Sitemap {
	return source
		.getPages()
		.filter((page) => getPagePublication(page).isIndexable)
		.map((page): MetadataRoute.Sitemap[number] => ({
			url: buildUrl(page.url),
			lastModified: page.data.lastModified,
			changeFrequency: 'weekly',
			priority: page.url === '/' ? 1 : 0.8,
		}))
}
