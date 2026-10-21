import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export function Del({ className, ...props }: ComponentProps<'del'>) {
	return (
		<del
			className={cn(
				'rounded-sm bg-red-100 px-0.5 font-semibold text-red-900 line-through decoration-red-700 dark:bg-red-600/95 dark:text-white dark:decoration-white',
				className,
			)}
			{...props}
		/>
	)
}

export function Ins({ className, ...props }: ComponentProps<'ins'>) {
	return (
		<ins
			className={cn(
				'rounded-sm bg-green-100 px-0.5 font-semibold text-green-900 no-underline dark:bg-green-700/95 dark:text-white',
				className,
			)}
			{...props}
		/>
	)
}
