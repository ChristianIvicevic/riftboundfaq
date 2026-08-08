import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
	return {
		rules: { allow: '/', disallow: '/api/' },
		sitemap: new URL('/sitemap.xml', SITE_URL).toString(),
	}
}
