import { cva } from 'class-variance-authority'

export const inlinePopoverTriggerVariants = cva(
	'rounded-xs border-0 bg-transparent p-0 text-inherit underline decoration-2 decoration-dotted decoration-fd-primary/70 underline-offset-2 transition-colors duration-100 hover:bg-fd-primary/10 hover:text-fd-primary hover:decoration-fd-primary focus-visible:bg-fd-primary/10 focus-visible:text-fd-primary focus-visible:decoration-fd-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring data-[popup-open]:bg-fd-primary/10 data-[popup-open]:text-fd-primary data-[popup-open]:decoration-fd-primary',
	{
		variants: {
			kind: {
				card: 'cursor-pointer font-medium whitespace-nowrap',
				term: 'cursor-help',
			},
		},
	},
)
