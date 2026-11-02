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
			className="group flex w-full items-center gap-4 rounded-xl border bg-fd-card p-4 text-left transition-colors hover:bg-fd-accent/70"
			data-search-full=""
		>
			<span className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-fd-muted text-fd-muted-foreground shadow-sm">
				<Search aria-hidden="true" className="size-5" />
			</span>
			<span className="min-w-0 flex-1">
				<span className="block text-sm font-medium text-fd-foreground">Search every ruling</span>
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
