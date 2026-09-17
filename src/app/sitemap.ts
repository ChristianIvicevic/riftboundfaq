import type { MetadataRoute } from 'next'
import { getPagePublishingDetails } from '@/lib/content/page-publishing-details'
import { source } from '@/lib/content/source'
import { SITE_URL } from '@/lib/site'

function buildUrl(path: string): string {
	return new URL(path, SITE_URL).toString()
}

export default function sitemap(): MetadataRoute.Sitemap {
	return source
		.getPages()
		.filter((page) => getPagePublishingDetails(page).isIndexable)
		.map((page): MetadataRoute.Sitemap[number] => ({
			url: buildUrl(page.url),
			lastModified: page.data.lastModified,
			changeFrequency: 'weekly',
			priority: page.url === '/' ? 1 : 0.8,
		}))
}
