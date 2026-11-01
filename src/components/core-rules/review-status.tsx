'use client'

import { Popover } from '@base-ui/react/popover'
import { CircleCheck } from 'lucide-react'
import { useState } from 'react'

export function CurrentCoreRulesReviewStatus({ currentVersion }: { currentVersion: string }) {
	const [open, setOpen] = useState(false)

	return (
		<Popover.Root onOpenChange={setOpen} open={open}>
			<Popover.Trigger
				aria-label={`Reviewed against current Core Rules ${currentVersion}`}
				className="inline-flex h-7 shrink-0 cursor-help items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 text-xs font-medium text-green-800 transition-colors hover:bg-green-100 focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:outline-none dark:border-green-900 dark:bg-green-950 dark:text-green-200 dark:hover:bg-green-900"
				onFocus={(event) => {
					if (event.currentTarget.matches(':focus-visible')) setOpen(true)
				}}
				openOnHover
				type="button"
			>
				<CircleCheck aria-hidden="true" className="size-4" />
				<span>Reviewed</span>
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
