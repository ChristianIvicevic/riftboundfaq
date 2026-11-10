import type { PageImageData } from '@/app/og/[...slug]/page-image-layouts'
import { getPageImageDisplayTitle, resolvePageImageTreatment } from '@/app/og/[...slug]/page-image-treatment'
import { getCardReference } from '@/lib/cards/catalog'
import { getPagePublishingDetails } from '@/lib/content/page-publishing-details'

export type PageImagePage = {
	url: string
	data: {
		title: string
		description?: string
		noindex?: boolean
	}
}

function requireCardReference(title: string) {
	const reference = getCardReference(title)
	if (!reference) throw new Error(`Missing card catalog reference for ${JSON.stringify(title)}`)
	return reference
}

function assertNever(value: never): never {
	throw new Error(`Unhandled page image treatment ${JSON.stringify(value)}`)
}

export function getPageImageData(
	page: PageImagePage,
	setLogoSrc: (editionName: string) => string | undefined,
): PageImageData {
	const treatment = resolvePageImageTreatment(page)
	const publishingDetails = getPagePublishingDetails(page)
	const common = {
		title: getPageImageDisplayTitle(page, treatment),
		description:
			(treatment.kind === 'landing' ? treatment.displayDescription : undefined) ??
			publishingDetails.description,
	}

	switch (treatment.kind) {
		case 'landing':
		case 'editorial':
		case 'index-cover':
			return {
				...common,
				visual: { kind: 'site-mark' },
			}
		case 'card': {
			const card = requireCardReference(page.data.title)
			return {
				...common,
				visual: {
					kind: 'card',
					src: card.imageUrl,
					width: card.imageWidth,
					height: card.imageHeight,
				},
			}
		}
		case 'general-rules':
		case 'mechanic-topic':
			return {
				...common,
				visual: { kind: 'site-mark' },
			}
		case 'mechanic-keyword':
			return {
				...common,
				visual: {
					kind: 'keyword',
					label: page.data.title,
					backgroundColor: treatment.keyword.backgroundColor,
					accentColor: treatment.keyword.accentColor,
				},
			}
		case 'rules-reference': {
			const { cover } = treatment
			if (cover.kind === 'core-rules') {
				const edition = {
					name: cover.editionName,
					logoSrc: setLogoSrc(cover.editionName),
				}
				return {
					...common,
					visual: { kind: 'rules-edition', edition },
				}
			}

			return {
				...common,
				visual: { kind: 'site-mark' },
			}
		}
		case 'rules-diff': {
			const { transition } = treatment
			if (transition.kind === 'core-rules') {
				const from = {
					name: transition.fromEditionName,
					logoSrc: setLogoSrc(transition.fromEditionName),
				}
				const current = {
					name: transition.toEditionName,
					logoSrc: setLogoSrc(transition.toEditionName),
				}
				return {
					...common,
					visual: { kind: 'rules-transition', from, current },
				}
			}

			return {
				...common,
				visual: { kind: 'site-mark' },
			}
		}
	}
	return assertNever(treatment)
}
