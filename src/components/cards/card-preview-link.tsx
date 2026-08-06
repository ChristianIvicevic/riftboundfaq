'use client'

import { Tooltip } from '@base-ui/react/tooltip'
import type { ReactNode } from 'react'

export function CardPreviewLink({
	children,
	imageUrl,
	name,
	url,
}: {
	children: ReactNode
	imageUrl: string
	name: string
	url: string
}) {
	return (
		<Tooltip.Root disableHoverablePopup>
			<Tooltip.Trigger
				delay={300}
				render={(props) => (
					<a
						{...props}
						className="font-medium text-fd-primary underline decoration-fd-primary/35 decoration-dotted underline-offset-2 hover:decoration-fd-primary"
						href={url}
						target="_blank"
						rel="noopener noreferrer"
					>
						{children}
					</a>
				)}
			/>
			<Tooltip.Portal>
				<Tooltip.Positioner className="z-50 max-w-[calc(100vw-2rem)]" sideOffset={8}>
					<Tooltip.Popup className="w-64 origin-(--transform-origin) rounded-xl border bg-fd-popover/80 p-1 text-fd-popover-foreground shadow-xl backdrop-blur-lg transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
						<span className="sr-only">{name} card preview</span>
						<img
							alt=""
							className="m-0! block h-auto w-full rounded-lg"
							height={420}
							src={imageUrl}
							width={300}
						/>
					</Tooltip.Popup>
				</Tooltip.Positioner>
			</Tooltip.Portal>
		</Tooltip.Root>
	)
}
