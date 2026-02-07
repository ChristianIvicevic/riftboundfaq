import { cva, VariantProps } from 'class-variance-authority'
import { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const keywordVariants = cva(
	'mx-0.5 inline-flex -skew-x-12 items-center justify-center px-2 text-sm font-bold uppercase text-white',
	{
		variants: {
			variant: {
				primary: 'bg-[#4e9f8b]',
				secondary: 'bg-[#b8416d]',
				tertiary: 'bg-[#6c7071]',
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
	return <Keyword variant="secondary">Assault {value}</Keyword>
}

export function Shield({ value }: { value?: number }) {
	return <Keyword variant="secondary">Shield {value}</Keyword>
}

export function Equip() {
	return <Keyword variant="tertiary">Equip</Keyword>
}

export function QuickDraw() {
	return <Keyword variant="primary">Quick-Draw</Keyword>
}

export function Weaponmaster() {
	return <Keyword variant="tertiary">Weaponmaster</Keyword>
}

export function Repeat() {
	return <Keyword variant="primary">Repeat</Keyword>
}
