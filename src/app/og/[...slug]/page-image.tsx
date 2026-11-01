import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'takumi-js/response'
import {
	CardPageImage,
	EditorialPageImage,
	GeneralRulesPageImage,
	IndexCoverPageImage,
	KeywordMechanicPageImage,
	LandingPageImage,
	MechanicTopicPageImage,
	RulesDiffPageImage,
	RulesReferencePageImage,
} from '@/app/og/[...slug]/page-image-layouts'
import { getPageImageDisplayTitle, resolvePageImageTreatment } from '@/app/og/[...slug]/page-image-treatment'
import { getCardReference } from '@/lib/cards/catalog'
import { getPagePublishingDetails } from '@/lib/content/page-publishing-details'
import { PAGE_IMAGE_SIZE } from '@/lib/content/source'
import { SITE_NAME } from '@/lib/site'

type PageImagePage = {
	url: string
	data: {
		title: string
		description?: string
		noindex?: boolean
	}
}

const LOGO_DATA = Uint8Array.from(await readFile(join(process.cwd(), 'src', 'app', 'icon.png'))).buffer
const CARD_IMAGE_HOST = 'cmsassets.rgpub.io'
const CARD_IMAGE_FETCH_TIMEOUT_MS = 10_000
const CARD_IMAGE_MAX_BYTES = 8 * 1024 * 1024

function requireCardReference(title: string) {
	const reference = getCardReference(title)
	if (!reference) throw new Error(`Missing card catalog reference for ${JSON.stringify(title)}`)
	return reference
}

function assertNever(value: never): never {
	throw new Error(`Unhandled page image treatment ${JSON.stringify(value)}`)
}

export function createPageImageResponse(page: PageImagePage) {
	const treatment = resolvePageImageTreatment(page)
	const publishingDetails = getPagePublishingDetails(page)
	const pageImageProps = {
		title: getPageImageDisplayTitle(page, treatment),
		description: treatment.kind === 'landing' ? treatment.displayDescription : publishingDetails.description,
		logoSrc: 'logo',
		site: SITE_NAME,
	}
	const image = (() => {
		switch (treatment.kind) {
			case 'landing':
				return <LandingPageImage {...pageImageProps} />
			case 'editorial':
				return <EditorialPageImage {...pageImageProps} />
			case 'index-cover':
				return <IndexCoverPageImage {...pageImageProps} {...treatment} />
			case 'general-rules':
				return <GeneralRulesPageImage {...pageImageProps} />
			case 'mechanic-keyword':
				return <KeywordMechanicPageImage {...pageImageProps} {...treatment.keyword} />
			case 'mechanic-topic':
				return <MechanicTopicPageImage {...pageImageProps} />
			case 'rules-reference':
				return <RulesReferencePageImage {...pageImageProps} {...treatment.cover} />
			case 'rules-diff':
				return <RulesDiffPageImage {...pageImageProps} {...treatment.transition} />
			case 'card': {
				const cardReference = requireCardReference(page.data.title)
				return (
					<CardPageImage
						{...pageImageProps}
						cardImageSrc={cardReference.imageUrl}
						cardImageWidth={cardReference.imageWidth}
						cardImageHeight={cardReference.imageHeight}
					/>
				)
			}
		}
		return assertNever(treatment)
	})()

	return new ImageResponse(image, {
		...PAGE_IMAGE_SIZE,
		images: {
			sources: [{ src: 'logo', data: () => LOGO_DATA }],
			timeout: CARD_IMAGE_FETCH_TIMEOUT_MS,
			maxBytes: CARD_IMAGE_MAX_BYTES,
			allowUrl: (url) => new URL(url).hostname === CARD_IMAGE_HOST,
		},
	})
}
