import { getRulingPageKind } from '@/lib/content/page-policy'
import { SITE_TITLE } from '@/lib/site'

type TitledPage = {
	url: string
	data: { title: string; metadataTitle?: string }
}

export function getPageTitle(page: TitledPage) {
	if (page.url === '/') return SITE_TITLE
	if (page.data.metadataTitle) return page.data.metadataTitle
	const kind = getRulingPageKind(page.url)
	if (kind === 'card') return `${page.data.title} Rulings`
	if (kind === 'mechanic') return `${page.data.title} Rules`
	return page.data.title
}
