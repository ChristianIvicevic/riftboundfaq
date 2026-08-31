'use client'

import { Popover } from '@base-ui/react/popover'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { useRef, useState } from 'react'
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
	const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
	const popoverSession = useRef(0)

	async function copyRule() {
		const session = popoverSession.current
		setCopyStatus('idle')
		try {
			await navigator.clipboard.writeText(previewText)
			if (session === popoverSession.current) setCopyStatus('copied')
		} catch (error) {
			console.warn('Failed to copy rule text', error)
			if (session === popoverSession.current) setCopyStatus('error')
		}
	}

	function handleOpenChange(open: boolean) {
		if (open) return
		popoverSession.current += 1
		setCopyStatus('idle')
	}

	return (
		<Popover.Root onOpenChange={handleOpenChange}>
			<Popover.Trigger
				aria-label={`Preview rule ${number}`}
				className="cursor-pointer border-0 bg-transparent p-0 text-nowrap text-fd-muted-foreground no-underline hover:text-fd-primary focus-visible:text-fd-primary"
				openOnHover
			>
				[{number}]
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner className="z-50 max-w-[calc(100vw-2rem)]" side="top" sideOffset={8}>
					<Popover.Popup className="max-w-100 origin-(--transform-origin) rounded-xl border bg-fd-popover/80 px-4 py-3 text-sm leading-relaxed text-fd-popover-foreground shadow-xl backdrop-blur-lg transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
						<Popover.Title className="sr-only">Rule {number}</Popover.Title>
						<Popover.Description className="m-0">
							<span className="font-mono font-medium">{number}.</span> {rulesText}
						</Popover.Description>
						<div className="mt-2 flex justify-end gap-1">
							<button
								className={buttonVariants({ variant: 'ghost', size: 'sm' })}
								onClick={copyRule}
								type="button"
							>
								{copyStatus === 'copied' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
								<span aria-live="polite">
									{copyStatus === 'copied' ? 'Copied' : copyStatus === 'error' ? 'Copy failed' : 'Copy'}
								</span>
							</button>
							<a
								className={buttonVariants({ variant: 'secondary', size: 'sm' })}
								href={href}
								rel="noopener noreferrer"
								target="_blank"
							>
								Open rule
								<ExternalLink className="size-3.5" />
							</a>
						</div>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	)
}
