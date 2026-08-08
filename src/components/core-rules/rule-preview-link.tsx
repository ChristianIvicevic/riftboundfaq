'use client'

import { Tooltip } from '@base-ui/react/tooltip'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { buttonVariants } from '@/components/ui/button'

export function RulePreviewLink({
	href,
	number,
	rulesText,
}: {
	href: string
	number: string
	rulesText: string
}) {
	const previewText = `${number}. ${rulesText}`
	const [copied, setCopied] = useState(false)

	async function copyRule() {
		setCopied(false)
		try {
			await navigator.clipboard.writeText(previewText)
			setCopied(true)
		} catch (error) {
			console.warn('Failed to copy rule text', error)
		}
	}

	return (
		<Tooltip.Root onOpenChange={(open) => !open && setCopied(false)}>
			<Tooltip.Trigger
				delay={300}
				closeDelay={300}
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
					<Tooltip.Popup className="flex max-w-100 origin-(--transform-origin) items-start gap-2 rounded-xl border bg-fd-popover/80 px-4 py-3 text-sm leading-relaxed text-fd-popover-foreground shadow-xl backdrop-blur-lg transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
						<p className="m-0 flex-1">
							<span className="font-mono font-medium">{number}.</span> {rulesText}
						</p>
						<button
							aria-label={`Copy rule ${number}`}
							className={buttonVariants({ variant: 'ghost', size: 'icon-xs' })}
							onClick={copyRule}
							title={`Copy rule ${number}`}
							type="button"
						>
							{copied ? <Check /> : <Copy />}
							<span aria-live="polite" className="sr-only">
								{copied ? `Copied rule ${number}` : ''}
							</span>
						</button>
					</Tooltip.Popup>
				</Tooltip.Positioner>
			</Tooltip.Portal>
		</Tooltip.Root>
	)
}
