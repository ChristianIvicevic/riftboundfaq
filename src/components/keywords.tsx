import { cva, VariantProps } from 'class-variance-authority'
import { ReactNode } from 'react'
import { cn } from '@/lib/cn'

// Resources
export function Energy({ value }: { value: number }) {
	return (
		<span className="mx-0.5 inline-flex size-5 items-center justify-center rounded-full bg-black p-2 text-xs font-bold text-white tabular-nums dark:bg-white dark:text-black">
			{value}
		</span>
	)
}

export function Power({ type }: { type: string }) {
	return (
		<img alt={type.toLocaleUpperCase()} src={`/images/${type}.webp`} className="mx-0.5 my-0! inline size-5" />
	)
}

// Keywords
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
