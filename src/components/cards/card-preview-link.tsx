'use client'

import { Popover } from '@base-ui/react/popover'
import { Images } from 'lucide-react'
import type { ReactNode } from 'react'
import { RiftboundLogo } from '@/components/icons/riftbound-logo'
import { buttonVariants } from '@/components/ui/button'
import { inlinePopoverTriggerVariants } from '@/components/ui/inline-popover-trigger'

export function CardPreviewLink({
	children,
	galleryUrl,
	imageUrl,
	name,
	wikiUrl,
}: {
	children: ReactNode
	galleryUrl: string
	imageUrl: string
	name: string
	wikiUrl: string
}) {
	return (
		<Popover.Root>
			<Popover.Trigger
				aria-label={`Preview ${name}`}
				className={inlinePopoverTriggerVariants({ kind: 'card' })}
				nativeButton={false}
				openOnHover
				render={<span />}
			>
				{children}
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner className="z-50 max-w-[calc(100vw-2rem)]" sideOffset={8}>
					<Popover.Popup className="max-h-(--available-height) w-64 origin-(--transform-origin) overflow-y-auto rounded-xl border bg-fd-popover/80 p-1 text-fd-popover-foreground shadow-xl backdrop-blur-lg transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
						<Popover.Title className="sr-only">{name} card preview</Popover.Title>
						<img
							alt=""
							className="m-0! block h-auto w-full rounded-lg"
							height={420}
							src={imageUrl}
							width={300}
						/>
						<div className="mt-1 grid gap-1">
							<a
								className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'w-full gap-2' })}
								href={wikiUrl}
								rel="noopener noreferrer"
								target="_blank"
							>
								<RiftboundLogo className="size-3.5 text-[#EF7D00]!" />
								Open in Riftbound Wiki
							</a>
							<a
								className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'w-full gap-2' })}
								href={galleryUrl}
								rel="noopener noreferrer"
								target="_blank"
							>
								<Images className="size-3.5 text-fd-muted-foreground" />
								Open in Card Gallery
							</a>
						</div>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	)
}
