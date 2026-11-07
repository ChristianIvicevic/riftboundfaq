import type { ReactNode } from 'react'
import type { RulesDocumentContent } from '@/lib/rules/document-types'

export function RulesContentBlock({
	kind,
	children,
}: {
	kind: RulesDocumentContent['kind']
	children: ReactNode
}) {
	if (kind === 'example') {
		return (
			<div className="border-l-2 border-amber-600 bg-amber-500/5 py-1 pr-2 pl-3 text-sm text-fd-muted-foreground dark:border-amber-400">
				{children}
			</div>
		)
	}
	if (kind === 'reference') return <p className="text-sm text-fd-muted-foreground">{children}</p>
	if (kind === 'bullet') {
		return (
			<div className="flex gap-2">
				<span aria-hidden="true" className="text-fd-muted-foreground">
					•
				</span>
				<p>{children}</p>
			</div>
		)
	}
	return <p>{children}</p>
}
