import { cva } from 'class-variance-authority'
import { cn } from '@/lib/cn'

export type RulesChangeBadgeStatus = 'new' | 'deleted' | 'changed'

const STATUS_LABELS = {
	new: 'Added',
	deleted: 'Removed',
	changed: 'Changed',
} satisfies Record<RulesChangeBadgeStatus, string>

const changeBadgeVariants = cva(
	'inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-xs font-semibold',
	{
		variants: {
			status: {
				new: 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200',
				deleted:
					'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200',
				changed:
					'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
			},
		},
	},
)

export function RulesChangeBadge({
	status,
	className,
}: {
	status: RulesChangeBadgeStatus
	className?: string
}) {
	return <span className={cn(changeBadgeVariants({ status }), className)}>{STATUS_LABELS[status]}</span>
}
