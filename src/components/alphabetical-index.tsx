import type { ReactNode } from 'react'

export function AlphabeticalIndex({ label, children }: { label: string; children: ReactNode }) {
	return (
		<nav
			aria-label={label}
			className="not-prose my-6 flex flex-wrap gap-2 [&_a]:inline-flex [&_a]:size-8 [&_a]:items-center [&_a]:justify-center [&_a]:rounded-md [&_a]:border [&_a]:border-fd-border [&_a]:bg-fd-background [&_a]:text-sm [&_a]:font-semibold [&_a]:text-fd-muted-foreground [&_a]:transition-colors [&_a:hover]:border-fd-primary/50 [&_a:hover]:text-fd-primary"
		>
			<span className="w-full text-xs font-semibold tracking-wide text-fd-muted-foreground uppercase">
				Jump to
			</span>
			{children}
		</nav>
	)
}
