import { Images, PencilLine } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { GITHUB_REPO_URL } from '@/lib/constants'

export function CardGalleryLink(props: { href: string }) {
	return (
		<a
			href={props.href}
			rel="noopener noreferrer"
			target="_blank"
			className={buttonVariants({
				variant: 'secondary',
				size: 'sm',
				className: 'gap-2 [&_svg]:size-3.5 [&_svg]:text-fd-muted-foreground',
			})}
		>
			<Images />
			Open in Card Gallery
		</a>
	)
}

export function EditThisPageLink(props: { filePath: string }) {
	return (
		<a
			href={`${GITHUB_REPO_URL}/blob/main/content/${props.filePath}`}
			rel="noopener noreferrer"
			target="_blank"
			className={buttonVariants({
				variant: 'secondary',
				size: 'sm',
				className: 'gap-2 [&_svg]:size-3.5 [&_svg]:text-fd-muted-foreground',
			})}
		>
			<PencilLine />
			Edit this page
		</a>
	)
}
