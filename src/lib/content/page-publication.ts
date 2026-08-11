import { SITE_DESCRIPTION, SITE_TITLE } from '@/lib/site'

type PublicationPage = {
	url: string
	data: {
		title: string
		description?: string
		noindex?: boolean
	}
}

export type PagePublication = Readonly<{
	metadataTitle: string
	description: string
	isEditorial: boolean
	isIndexable: boolean
	isSourceAttributionEligible: boolean
}>

type EditorialFamilyPolicy = {
	prefix: string
	metadataTitle(title: string): string
	fallbackDescription(title: string): string
}

const EDITORIAL_FAMILY_POLICIES: readonly EditorialFamilyPolicy[] = [
	{
		prefix: '/cards/',
		metadataTitle: (title) => `${title} Rulings`,
		fallbackDescription: (title) =>
			`Unofficial Riftbound rulings for ${title}, with rules explanations, examples, and Core Rules citations.`,
	},
	{
		prefix: '/mechanics/',
		metadataTitle: (title) => `${title} Rules`,
		fallbackDescription: (title) =>
			`Unofficial answers about the ${title} mechanic in Riftbound, with examples and Core Rules citations.`,
	},
	{
		prefix: '/general-rules/',
		metadataTitle: (title) => title,
		fallbackDescription: (title) =>
			`Unofficial Riftbound rules answers about ${title.toLowerCase()}, with examples and Core Rules citations.`,
	},
]

export function getPagePublication(page: PublicationPage): PagePublication {
	const family = EDITORIAL_FAMILY_POLICIES.find(({ prefix }) => page.url.startsWith(prefix))
	const metadataTitle =
		page.url === '/' ? SITE_TITLE : (family?.metadataTitle(page.data.title) ?? page.data.title)
	const fallbackDescription = family?.fallbackDescription(page.data.title) ?? SITE_DESCRIPTION

	return {
		metadataTitle,
		description: page.data.description || fallbackDescription,
		isEditorial: family !== undefined,
		isIndexable: page.data.noindex !== true,
		isSourceAttributionEligible: page.url !== '/reference' && !page.url.startsWith('/reference/'),
	}
}
