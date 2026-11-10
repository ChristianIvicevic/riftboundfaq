'use client'

import { Popover } from '@base-ui/react/popover'
import { useState } from 'react'
import { statusBadgeVariants } from '@/components/ui/status-badge'
import { cn } from '@/lib/cn'

export function CurrentCoreRulesReviewStatus({ currentVersion }: { currentVersion: string }) {
	const [open, setOpen] = useState(false)

	return (
		<Popover.Root onOpenChange={setOpen} open={open}>
			<Popover.Trigger
				aria-label={`Reviewed against current Core Rules ${currentVersion}`}
				className={cn(statusBadgeVariants({ interactive: true, tone: 'positive' }), 'cursor-help')}
				data-slot="status-badge"
				onFocus={(event) => {
					if (event.currentTarget.matches(':focus-visible')) setOpen(true)
				}}
				openOnHover
				type="button"
			>
				Reviewed
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner className="z-50 max-w-[calc(100vw-2rem)]" side="bottom" sideOffset={8}>
					<Popover.Popup
						className="w-80 max-w-[calc(100vw-2rem)] origin-(--transform-origin) rounded-xl border bg-fd-popover/80 px-4 py-3 text-fd-popover-foreground shadow-xl backdrop-blur-lg transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0"
						initialFocus={false}
					>
						<Popover.Title className="mb-1 text-sm font-semibold">Current Core Rules</Popover.Title>
						<Popover.Description className="m-0 text-sm leading-relaxed text-fd-muted-foreground">
							This page has been reviewed against the current Core Rules, version {currentVersion}.
						</Popover.Description>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	)
}
