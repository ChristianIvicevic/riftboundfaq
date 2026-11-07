'use client'

import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { RulesChangeTable } from '@/components/rules/side-by-side-change-view'
import type { PreparedRulesChange } from '@/features/rules-documents/rules-change'

function subscribeLocation(onStoreChange: () => void) {
	window.addEventListener('popstate', onStoreChange)
	return () => window.removeEventListener('popstate', onStoreChange)
}

function locationSnapshot() {
	return window.location.href
}

function staticLocationSnapshot() {
	// Rules pages stay prerenderable; Context is the intentional no-JavaScript fallback.
	return ''
}

function setView(view: 'context' | 'before-and-after') {
	const nextUrl = new URL(window.location.href)
	if (view === 'context') nextUrl.searchParams.delete('view')
	else nextUrl.searchParams.set('view', view)
	if (nextUrl.href === window.location.href) return
	window.history.pushState(null, '', nextUrl)
	window.dispatchEvent(new PopStateEvent('popstate'))
}

function useComparisonView() {
	const locationHref = useSyncExternalStore(subscribeLocation, locationSnapshot, staticLocationSnapshot)
	const searchParams = locationHref ? new URL(locationHref).searchParams : new URLSearchParams()
	return {
		hydrated: locationHref !== '',
		view: searchParams.get('view') === 'before-and-after' ? 'before-and-after' : 'context',
	} as const
}

export function RulesComparisonControls({ change }: { change: PreparedRulesChange }) {
	const { hydrated, view } = useComparisonView()
	const [titleActions, setTitleActions] = useState<Element | null>(null)
	useEffect(() => {
		setTitleActions(document.querySelector('[data-page-title-actions]'))
	}, [])
	return (
		<div className="peer contents" data-view={view}>
			{hydrated &&
				titleActions &&
				createPortal(
					<ToggleGroup
						aria-label="Rules comparison view"
						className="not-prose inline-flex rounded-lg border border-fd-border bg-fd-background p-1 shadow-sm"
						onValueChange={(values) => {
							const nextView = values[0]
							if (nextView === 'context' || nextView === 'before-and-after') setView(nextView)
						}}
						value={[view]}
					>
						<Toggle
							className="rounded-md px-3 py-1.5 text-sm font-medium text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground focus-visible:outline-2 focus-visible:outline-fd-ring data-[pressed]:bg-fd-primary data-[pressed]:text-fd-primary-foreground"
							value="context"
						>
							Changes in context
						</Toggle>
						<Toggle
							className="rounded-md px-3 py-1.5 text-sm font-medium text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground focus-visible:outline-2 focus-visible:outline-fd-ring data-[pressed]:bg-fd-primary data-[pressed]:text-fd-primary-foreground"
							value="before-and-after"
						>
							Before &amp; after
						</Toggle>
					</ToggleGroup>,
					titleActions,
				)}
			{view === 'before-and-after' && <RulesChangeTable change={change} />}
		</div>
	)
}
