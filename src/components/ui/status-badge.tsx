import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/cn'

export const statusBadgeVariants = cva(
	'inline-flex h-5 w-fit shrink-0 items-center justify-center rounded border border-fd-border border-l-[3px] bg-fd-background px-[0.45rem] text-[0.625rem] leading-3 font-bold tracking-[0.075em] whitespace-nowrap uppercase transition-colors focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:outline-none',
	{
		variants: {
			tone: {
				info: 'border-l-fd-primary text-fd-primary',
				positive: 'border-l-green-700 text-green-800 dark:border-l-green-300 dark:text-green-200',
				caution: 'border-l-amber-800 text-amber-900 dark:border-l-amber-300 dark:text-amber-200',
				negative: 'border-l-red-700 text-red-800 dark:border-l-red-300 dark:text-red-200',
			},
			interactive: {
				true: '',
				false: '',
			},
		},
		compoundVariants: [
			{ tone: 'info', interactive: true, className: 'hover:bg-fd-primary/10' },
			{
				tone: 'positive',
				interactive: true,
				className: 'hover:bg-green-50 dark:hover:bg-green-950',
			},
			{
				tone: 'caution',
				interactive: true,
				className: 'hover:bg-amber-100 dark:hover:bg-amber-950/60',
			},
			{
				tone: 'negative',
				interactive: true,
				className: 'hover:bg-red-50 dark:hover:bg-red-950',
			},
		],
		defaultVariants: {
			interactive: false,
		},
	},
)

export type StatusBadgeTone = NonNullable<VariantProps<typeof statusBadgeVariants>['tone']>

export function StatusBadge({
	className,
	interactive,
	tone,
	...props
}: ComponentPropsWithoutRef<'span'> & VariantProps<typeof statusBadgeVariants>) {
	return (
		<span
			className={cn(statusBadgeVariants({ interactive, tone }), className)}
			data-slot="status-badge"
			{...props}
		/>
	)
}
