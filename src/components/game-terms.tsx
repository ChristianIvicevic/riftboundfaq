import { cva } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { TERM_DEFINITIONS, type TermName, type TermVariant } from '@/lib/mdx-vocabulary'

// SAFETY: TERM_DEFINITIONS is a closed, owned object, so Object.keys returns only TermName values.
const TERM_NAMES = Object.keys(TERM_DEFINITIONS) as TermName[]

const termVariants = cva(
	'mx-0.5 inline-flex -skew-x-12 items-center justify-center px-2 text-sm font-bold uppercase tracking-tight',
	{
		variants: {
			variant: {
				primary: 'bg-[#4e9f8b] text-white',
				secondary: 'bg-[#9eb149] text-black',
				accent: 'bg-[#b8416d] text-white',
				tertiary: 'bg-[#6c7071] text-white',
			} as const satisfies Record<TermVariant, string>,
		},
	},
)

function GameTerm({
	children,
	copyText,
	variant,
}: {
	children: ReactNode
	copyText: string
	variant: TermVariant
}) {
	return (
		<span className={cn(termVariants({ variant }))} data-copy-text={copyText}>
			{children}
		</span>
	)
}

function createGameTermComponent(name: TermName) {
	const definition = TERM_DEFINITIONS[name]

	if ('hasValue' in definition) {
		return function GameTermWithValue({ value }: { value?: number | string }) {
			const label = value === undefined ? definition.label : `${definition.label} ${value}`

			return (
				<GameTerm copyText={`[${label}]`} variant={definition.variant}>
					{label}
				</GameTerm>
			)
		}
	}

	return function GameTermWithoutValue() {
		return (
			<GameTerm copyText={`[${definition.label}]`} variant={definition.variant}>
				{definition.label}
			</GameTerm>
		)
	}
}

export const MDX_TERMS =
	// SAFETY: TERM_NAMES contains every TERM_DEFINITIONS key, and the mapping emits one component for each key.
	Object.fromEntries(TERM_NAMES.map((name) => [name, createGameTermComponent(name)])) as {
		[K in TermName]: ReturnType<typeof createGameTermComponent>
	}

const GAME_TERM_COMPONENTS_BY_LABEL = new Map<string, (typeof MDX_TERMS)[TermName]>(
	TERM_NAMES.map((name) => [TERM_DEFINITIONS[name].label, MDX_TERMS[name]] as const),
)

export function getGameTermComponentByLabel(label: string) {
	return GAME_TERM_COMPONENTS_BY_LABEL.get(label)
}
