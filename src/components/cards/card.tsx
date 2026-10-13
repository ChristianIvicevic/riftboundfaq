import type { ReactNode } from 'react'
import { CardPreviewLink } from '@/components/cards/card-preview-link'
import { getCardImageUrl } from '@/lib/cards/catalog'
import { getRiftboundWikiUrl } from '@/lib/cards/links'

export function Card({ name, children }: { name: string; children?: ReactNode }) {
	const imageUrl = getCardImageUrl(name)
	const wikiUrl = getRiftboundWikiUrl(name)
	const content = children ?? name
	if (!imageUrl) {
		return (
			<a
				className="font-medium whitespace-nowrap text-fd-primary underline decoration-fd-primary/35 underline-offset-2 hover:decoration-fd-primary"
				href={wikiUrl}
				rel="noopener noreferrer"
				target="_blank"
			>
				{content}
			</a>
		)
	}
	return (
		<CardPreviewLink imageUrl={imageUrl} name={name} wikiUrl={wikiUrl}>
			{content}
		</CardPreviewLink>
	)
}
