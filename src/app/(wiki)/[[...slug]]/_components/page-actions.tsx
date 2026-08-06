import { Images, PencilLine } from 'lucide-react'
import type { ReactNode } from 'react'
import { RiftboundLogo } from '@/components/icons/riftbound-logo'
import { buttonVariants } from '@/components/ui/button'
import { GITHUB_REPO_URL } from '@/lib/site'

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

export function PageActions({
	galleryLink,
	riftboundWikiUrl,
	filePath,
}: {
	galleryLink?: string
	riftboundWikiUrl?: string
	filePath: string
}) {
	return (
		<div className="flex flex-row flex-wrap items-center gap-2 border-b pb-6">
			{galleryLink && (
				<PageActionLink href={galleryLink}>
					<Images />
					Open in Card Gallery
				</PageActionLink>
			)}
			{riftboundWikiUrl && (
				<PageActionLink href={riftboundWikiUrl}>
					<RiftboundLogo className="text-[#EF7D00]!" />
					Open in Riftbound Wiki
				</PageActionLink>
			)}
			<PageActionLink href={`${GITHUB_REPO_URL}/blob/main/content/${filePath}`}>
				<PencilLine />
				Edit this page
			</PageActionLink>
		</div>
	)
}
