import { cva } from 'class-variance-authority'
import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { TERM_DEFINITIONS, type TermName, type TermVariant } from '@/lib/mdx-vocabulary'

// SAFETY: TERM_DEFINITIONS is a closed, owned object, so Object.keys returns only TermName values.
const TERM_NAMES = Object.keys(TERM_DEFINITIONS) as TermName[]

type GameTermProps = {
	associatedAbility?: boolean
	value?: number | string
}

const termVariants = cva(
	'mx-0.5 inline-flex -skew-x-12 items-center justify-center px-2 text-sm font-bold uppercase tracking-tight',
	{
		variants: {
			associatedAbility: {
				false: null,
				true: "relative mr-3 after:absolute after:inset-y-0 after:left-full after:-ml-px after:w-3 after:bg-inherit after:[clip-path:polygon(0_0,100%_50%,0_100%)] after:content-['']",
			},
			variant: {
				primary: 'bg-[#107361] text-white',
				secondary: 'bg-[#95b229] text-black',
				accent: 'bg-[#cc366b] text-white',
				tertiary: 'bg-[#6b6b6b] text-white',
			} as const satisfies Record<TermVariant, string>,
		},
	},
)

function GameTerm({
	associatedAbility,
	children,
	copyText,
	variant,
}: {
	associatedAbility?: boolean
	children: ReactNode
	copyText: string
	variant: TermVariant
}) {
	return (
		<span
			className={cn(termVariants({ associatedAbility, variant }))}
			data-copy-text={`${copyText}${associatedAbility ? '[>]' : ''}`}
		>
			{children}
		</span>
	)
}

function createGameTermComponent(name: TermName) {
	const definition = TERM_DEFINITIONS[name]

	return function GameTermComponent({ associatedAbility, value }: GameTermProps) {
		const label =
			'hasValue' in definition && value !== undefined ? `${definition.label} ${value}` : definition.label

		return (
			<GameTerm associatedAbility={associatedAbility} copyText={`[${label}]`} variant={definition.variant}>
				{label}
			</GameTerm>
		)
	}
}

export const MDX_TERMS =
	// SAFETY: TERM_NAMES contains every TERM_DEFINITIONS key, and the mapping emits one component for each key.
	Object.fromEntries(TERM_NAMES.map((name) => [name, createGameTermComponent(name)])) as {
		[K in TermName]: ReturnType<typeof createGameTermComponent>
	}

const GAME_TERMS_BY_LABEL = new Map<
	string,
	{ Component: ComponentType<GameTermProps>; acceptsValue: boolean }
>(
	TERM_NAMES.map((name) => {
		const definition = TERM_DEFINITIONS[name]
		return [
			definition.label,
			{
				Component: MDX_TERMS[name] as ComponentType<GameTermProps>,
				acceptsValue: 'hasValue' in definition,
			},
		] as const
	}),
)

export function getGameTermComponentByLabel(label: string) {
	return GAME_TERMS_BY_LABEL.get(label)?.Component
}

export function resolveGameTermToken(token: string) {
	const match = /^(.*?)(?: (\d+))?$/u.exec(token)
	if (!match?.[1]) return

	const gameTerm = GAME_TERMS_BY_LABEL.get(match[1])
	if (!gameTerm || (match[2] && !gameTerm.acceptsValue)) return

	return { Component: gameTerm.Component, value: match[2] }
}
