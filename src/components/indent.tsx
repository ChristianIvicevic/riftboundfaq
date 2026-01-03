import type { ReactNode } from 'react'

type IndentProps = {
	level: number
	children: ReactNode
}

export function Indent({ level, children }: IndentProps) {
	const paddingLeft = `${level * 2}rem`
	return <div style={{ paddingLeft }}>{children}</div>
}
