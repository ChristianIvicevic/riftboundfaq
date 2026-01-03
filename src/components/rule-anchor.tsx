import type { ReactNode } from 'react'

export function RuleAnchor({ children, id }: { children: ReactNode; id: string }) {
	return (
		<a href={`#${id}`} id={id}>
			{children}
		</a>
	)
}
