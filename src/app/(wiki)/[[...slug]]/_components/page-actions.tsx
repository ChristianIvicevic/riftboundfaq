import { Images } from 'lucide-react'
import type { ReactNode } from 'react'
import { RiftboundLogo } from '@/components/icons/riftbound-logo'
import { buttonVariants } from '@/components/ui/button'
import { getRiftboundWikiUrl } from '@/lib/cards/links'
import { getCardUrls } from '@/lib/cards/registry'

function PageActionLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<a
			href={href}
			rel="noopener noreferrer"
			target="_blank"
			className={buttonVariants({
				variant: 'secondary',
				size: 'sm',
				className: 'gap-2 [&_svg]:size-3.5 [&_svg]:text-fd-muted-foreground',
			})}
		>
			{children}
		</a>
	)
}

export function PageActions({ cardName }: { cardName?: string }) {
	const galleryUrl = cardName ? getCardUrls(cardName)?.galleryUrl : undefined
	const riftboundWikiUrl = cardName ? getRiftboundWikiUrl(cardName) : undefined

	return (
		<div className="flex flex-row flex-wrap items-center gap-2 border-b pb-6">
			{riftboundWikiUrl && (
				<PageActionLink href={riftboundWikiUrl}>
					<RiftboundLogo className="text-[#EF7D00]!" />
					Open in Riftbound Wiki
				</PageActionLink>
			)}
			{galleryUrl && (
				<PageActionLink href={galleryUrl}>
					<Images />
					Open in Card Gallery
				</PageActionLink>
			)}
		</div>
	)
}
