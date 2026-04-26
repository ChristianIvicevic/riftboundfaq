import { cva, type VariantProps } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const keywordVariants = cva(
	'mx-0.5 inline-flex -skew-x-12 items-center justify-center px-2 text-sm font-bold uppercase tracking-tight',
	{
		variants: {
			variant: {
				primary: 'bg-[#4e9f8b] text-white',
				secondary: 'bg-[#9eb149] text-black',
				accent: 'bg-[#b8416d] text-white',
				tertiary: 'bg-[#6c7071] text-white',
			},
		},
	},
)

type KeywordConfig = {
	label: string
	variant: Required<VariantProps<typeof keywordVariants>>['variant']
	hasValue?: true
}

// Configuration object mapping keyword names to their properties
const KEYWORD_CONFIG: Record<string, KeywordConfig> = {
	Accelerate: { label: 'Accelerate', variant: 'primary' },
	Action: { label: 'Action', variant: 'primary' },
	Add: { label: 'Add', variant: 'tertiary' },
	Assault: { label: 'Assault', variant: 'accent', hasValue: true },
	Deathknell: { label: 'Deathknell', variant: 'secondary' },
	Deflect: { label: 'Deflect', variant: 'secondary', hasValue: true },
	Equip: { label: 'Equip', variant: 'tertiary' },
	Mighty: { label: 'Mighty', variant: 'tertiary' },
	QuickDraw: { label: 'Quick-Draw', variant: 'primary' },
	Reaction: { label: 'Reaction', variant: 'primary' },
	Repeat: { label: 'Repeat', variant: 'primary' },
	Shield: { label: 'Shield', variant: 'accent', hasValue: true },
	Stun: { label: 'Stun', variant: 'tertiary' },
	Weaponmaster: { label: 'Weaponmaster', variant: 'tertiary' },
}

type KeywordName = keyof typeof KEYWORD_CONFIG

function Keyword({
	children,
	variant,
}: Required<VariantProps<typeof keywordVariants>> & { children: ReactNode }) {
	return <span className={cn(keywordVariants({ variant }))}>{children}</span>
}

function createKeywordComponent(name: KeywordName) {
	const config = KEYWORD_CONFIG[name]

	if (config.hasValue) {
		return function KeywordWithValue({ value }: { value?: number }) {
			return (
				<Keyword variant={config.variant}>
					{config.label} {value}
				</Keyword>
			)
		}
	}

	return function KeywordSimple() {
		return <Keyword variant={config.variant}>{config.label}</Keyword>
	}
}

export const KEYWORDS = Object.fromEntries(
	(Object.keys(KEYWORD_CONFIG) as KeywordName[]).map((name) => [name, createKeywordComponent(name)]),
) as { [K in KeywordName]: ReturnType<typeof createKeywordComponent> }
