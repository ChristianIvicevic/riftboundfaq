'use client'

import { Dialog } from '@base-ui/react/dialog'
import { useSearchContext } from 'fumadocs-ui/contexts/search'
import { Search } from 'lucide-react'

export function LandingSearchTrigger() {
	const { dialogHandle, enabled, hotKey } = useSearchContext()
	if (!enabled) return null

	return (
		<Dialog.Trigger
			handle={dialogHandle}
			type="button"
			className="group flex w-full items-center gap-4 rounded-xl border border-fd-primary/30 bg-fd-primary/5 p-4 text-left shadow-sm transition-colors hover:border-fd-primary/45 hover:bg-fd-primary/10 focus-visible:ring-2 focus-visible:ring-fd-primary/30"
		>
			<span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-fd-primary/20 bg-fd-primary/10 text-fd-primary shadow-sm">
				<Search aria-hidden="true" className="size-5" />
			</span>
			<span className="min-w-0 flex-1">
				<span className="block text-sm font-semibold text-fd-foreground">Search every ruling</span>
				<span className="mt-0.5 block text-sm leading-5 text-fd-muted-foreground">
					Look up a card, mechanic, rules topic, or question.
				</span>
			</span>
			<span className="hidden gap-1 sm:inline-flex">
				{hotKey.map((key, index) => (
					<kbd
						key={index}
						className="rounded-md border bg-fd-background px-1.5 py-0.5 text-xs text-fd-muted-foreground"
					>
						{key.display}
					</kbd>
				))}
			</span>
		</Dialog.Trigger>
	)
}
