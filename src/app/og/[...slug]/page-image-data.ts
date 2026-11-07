import type { PageImageData, PageImageEdition } from '@/app/og/[...slug]/page-image-layouts'
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

function formatEdition({ name, version }: PageImageEdition) {
	return version ? `${name} · ${version}` : name
}

function splitGenericEdition(label: string): PageImageEdition {
	const [name = label, ...versionParts] = label.split(' ')
	return { name, version: versionParts.join(' ') || undefined }
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
				railLabel: 'RIFTBOUND FAQ',
				visual: { kind: 'site-mark' },
			}
		case 'card': {
			const card = requireCardReference(page.data.title)
			return {
				...common,
				railLabel: 'CARD RULINGS',
				visual: {
					kind: 'card',
					src: card.imageUrl,
					width: card.imageWidth,
					height: card.imageHeight,
				},
			}
		}
		case 'general-rules':
			return {
				...common,
				railLabel: 'GENERAL RULES',
				railContext: page.data.title,
				visual: { kind: 'wordmark', primary: 'General', accent: 'Rules' },
			}
		case 'mechanic-keyword':
			return {
				...common,
				railLabel: 'MECHANIC · KEYWORD',
				railContext: page.data.title,
				visual: {
					kind: 'keyword',
					label: page.data.title,
					backgroundColor: treatment.keyword.backgroundColor,
					accentColor: treatment.keyword.accentColor,
				},
			}
		case 'mechanic-topic':
			return {
				...common,
				railLabel: 'MECHANIC',
				railContext: page.data.title,
				visual: { kind: 'wordmark', primary: 'Game', accent: 'Mechanics' },
			}
		case 'rules-reference': {
			const { cover } = treatment
			if (cover.kind === 'core-rules') {
				const edition: PageImageEdition = {
					name: cover.editionName,
					version: cover.versionLabel,
					logoSrc: setLogoSrc(cover.editionName),
				}
				return {
					...common,
					railLabel: 'CORE RULES · REFERENCE',
					railContext: formatEdition(edition),
					visual: { kind: 'rules-edition', edition },
				}
			}

			const edition: PageImageEdition = { name: cover.versionLabel, version: cover.editionLabel }
			return {
				...common,
				railLabel: `${cover.documentLabel} · REFERENCE`,
				railContext: formatEdition(edition),
				visual: { kind: 'site-mark' },
			}
		}
		case 'rules-diff': {
			const { transition } = treatment
			if (transition.kind === 'core-rules') {
				const from: PageImageEdition = {
					name: transition.fromEditionName,
					version: transition.fromLabel,
					logoSrc: setLogoSrc(transition.fromEditionName),
				}
				const current: PageImageEdition = {
					name: transition.toEditionName,
					version: transition.toLabel,
					logoSrc: setLogoSrc(transition.toEditionName),
				}
				return {
					...common,
					railLabel: 'CORE RULES · CHANGES',
					railContext: `${formatEdition(from)} TO ${formatEdition(current)}`,
					visual: { kind: 'rules-transition', from, current },
				}
			}

			const from = splitGenericEdition(transition.fromLabel)
			const current = splitGenericEdition(transition.toLabel)
			return {
				...common,
				railLabel: `${transition.documentLabel} · CHANGES`,
				railContext: `${formatEdition(from)} TO ${formatEdition(current)}`,
				visual: { kind: 'site-mark' },
			}
		}
	}
	return assertNever(treatment)
}
