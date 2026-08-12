import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const badgeVariants = cva(
	'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-fd-ring focus-visible:ring-[3px] focus-visible:ring-fd-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
	{
		variants: {
			variant: {
				default: 'bg-fd-primary text-fd-primary-foreground [a]:hover:bg-fd-primary/80',
				secondary: 'bg-fd-secondary text-fd-secondary-foreground [a]:hover:bg-fd-secondary/80',
				outline:
					'border-fd-border text-fd-foreground [a]:hover:bg-fd-muted [a]:hover:text-fd-muted-foreground',
				ghost: 'hover:bg-fd-muted hover:text-fd-muted-foreground dark:hover:bg-fd-muted/50',
				link: 'text-fd-primary underline-offset-4 hover:underline',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
)

function Badge({
	className,
	variant = 'default',
	render,
	...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
	return useRender({
		defaultTagName: 'span',
		props: mergeProps<'span'>({ className: cn(badgeVariants({ variant }), className) }, props),
		render,
		state: {
			slot: 'badge',
			variant,
		},
	})
}

export { Badge, badgeVariants }
