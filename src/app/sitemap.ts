import type { MetadataRoute } from 'next'
import { baseUrl } from '@/lib/metadata'
import { source } from '@/lib/source'

export default function sitemap(): MetadataRoute.Sitemap {
	const url = (path: string): string => new URL(path, baseUrl).toString()
	return source.getPages().map((page): MetadataRoute.Sitemap[number] => ({
		url: url(page.url),
		lastModified: page.data.lastModified,
		changeFrequency: 'weekly',
		priority: page.url === '/' ? 1 : 0.8,
	}))
}
