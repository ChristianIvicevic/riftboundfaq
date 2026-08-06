import type { ReactNode } from 'react'
import { CardPreviewLink } from '@/components/cards/card-preview-link'
import { getCardUrls, type CardSetId } from '@/lib/cards/registry'

export function Card({ name, set, children }: { name: string; set?: CardSetId; children?: ReactNode }) {
	const urls = getCardUrls(name, set)
	const content = children ?? name
	if (!urls) return <span>{content}</span>
	return (
		<CardPreviewLink imageUrl={urls.imageUrl} name={name} url={urls.galleryUrl}>
			{content}
		</CardPreviewLink>
	)
}
