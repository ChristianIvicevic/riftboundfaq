import type { MetadataRoute } from 'next'
import { baseUrl } from '@/lib/metadata'

export default function robots(): MetadataRoute.Robots {
	return {
		rules: { allow: '/', disallow: ['/api/', '/og/'] },
		sitemap: new URL('/sitemap.xml', baseUrl).toString(),
	}
}
