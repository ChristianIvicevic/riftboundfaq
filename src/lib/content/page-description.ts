import { getRulingPageKind } from '@/lib/content/page-policy'
import { SITE_DESCRIPTION } from '@/lib/site'

type DescribedPage = {
	url: string
	data: {
		title: string
		description?: string
	}
}

export function getPageDescription(page: DescribedPage) {
	const { description, title } = page.data
	if (description) return description

	switch (getRulingPageKind(page.url)) {
		case 'card':
			return `Unofficial Riftbound rulings for ${title}, with rules explanations, examples, and Core Rules citations.`
		case 'mechanic':
			return `Unofficial answers about the ${title} mechanic in Riftbound, with examples and Core Rules citations.`
		case 'general-rules':
			return `Unofficial Riftbound rules answers about ${title.toLowerCase()}, with examples and Core Rules citations.`
	}

	return SITE_DESCRIPTION
}
