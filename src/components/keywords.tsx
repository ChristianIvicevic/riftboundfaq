import { cva, VariantProps } from 'class-variance-authority'
import { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const keywordVariants = cva(
	'mx-0.5 inline-flex -skew-x-12 items-center justify-center px-2 text-sm font-bold uppercase text-white',
	{
		variants: {
			variant: {
				generic: 'bg-[#4e9f8b]',
				combat: 'bg-[#b8416d]',
			},
		},
	},
)

function Keyword({
	children,
	variant,
}: Required<VariantProps<typeof keywordVariants>> & { children: ReactNode }) {
	return <span className={cn(keywordVariants({ variant }))}>{children}</span>
}

export function Assault({ value }: { value?: number }) {
	return <Keyword variant="combat">Assault {value}</Keyword>
}

export function Shield({ value }: { value?: number }) {
	return <Keyword variant="combat">Shield {value}</Keyword>
}

export function Repeat() {
	return <Keyword variant="generic">Repeat</Keyword>
}
