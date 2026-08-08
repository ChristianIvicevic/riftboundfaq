'use client'

import { Tooltip } from '@base-ui/react/tooltip'

export function RulePreviewLink({
	href,
	number,
	rulesText,
}: {
	href: string
	number: string
	rulesText: string
}) {
	return (
		<Tooltip.Root>
			<Tooltip.Trigger
				delay={300}
				render={(props) => (
					<a
						{...props}
						className="text-nowrap no-underline"
						href={href}
						rel="noopener noreferrer"
						target="_blank"
					>
						[{number}]
					</a>
				)}
			/>
			<Tooltip.Portal>
				<Tooltip.Positioner className="z-50 max-w-[calc(100vw-2rem)]" sideOffset={8}>
					<Tooltip.Popup className="max-w-100 origin-(--transform-origin) rounded-xl border bg-fd-popover/80 px-4 py-3 text-sm leading-relaxed text-fd-popover-foreground shadow-xl backdrop-blur-lg transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
						{rulesText}
					</Tooltip.Popup>
				</Tooltip.Positioner>
			</Tooltip.Portal>
		</Tooltip.Root>
	)
}
