'use client'

import { Popover } from '@base-ui/react/popover'
import { useId, useState } from 'react'
import { inlinePopoverTriggerVariants } from '@/components/ui/inline-popover-trigger'

export function TermPopover({
	text,
	title,
	explanation,
}: {
	text: string
	title: string
	explanation: string
}) {
	const triggerId = useId()
	const [open, setOpen] = useState(false)

	return (
		<Popover.Root onOpenChange={setOpen} open={open} triggerId={triggerId}>
			<Popover.Trigger
				className={inlinePopoverTriggerVariants({ kind: 'term' })}
				data-copy-text={text}
				id={triggerId}
				nativeButton={false}
				onBlur={() => setOpen(false)}
				onFocus={(event) => {
					if (event.currentTarget.matches(':focus-visible')) setOpen(true)
				}}
				openOnHover
				render={<span />}
			>
				{text}
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner className="z-50 max-w-[calc(100vw-2rem)]" sideOffset={8}>
					<Popover.Popup
						className="w-80 max-w-[calc(100vw-2rem)] origin-(--transform-origin) rounded-xl border bg-fd-popover/80 px-4 py-3 text-fd-popover-foreground shadow-xl backdrop-blur-lg transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0"
						initialFocus={false}
					>
						<Popover.Title className="mb-1 text-sm font-semibold">{title}</Popover.Title>
						<Popover.Description className="m-0 text-sm leading-relaxed text-fd-muted-foreground">
							{explanation}
						</Popover.Description>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	)
}
