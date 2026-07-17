import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type IndentProps = {
	level: number
	children: ReactNode
}

export function Indent({ level, children }: IndentProps) {
	return (
		<div
			className={cn(
				level === 1 && 'pl-2 sm:pl-6',
				level === 2 && 'pl-4 sm:pl-12',
				level === 3 && 'pl-6 sm:pl-18',
				level === 4 && 'pl-8 sm:pl-24',
			)}
		>
			{children}
		</div>
	)
}
