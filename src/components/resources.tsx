import type { CSSProperties } from 'react'
import { RUNE_NAMES } from '@/lib/mdx-vocabulary'

const CARD_TEXT_SYMBOL_PATHS = {
	Exhaust: '/images/exhaust.svg',
	Might: '/images/might.svg',
} as const

type CardTextSymbolName = keyof typeof CARD_TEXT_SYMBOL_PATHS

export function Energy({ value }: { value: number }) {
	return (
		<span
			className="mx-0.5 inline-flex size-5 items-center justify-center rounded-full bg-black p-2 text-xs font-bold text-white not-italic tabular-nums dark:bg-white dark:text-black"
			data-copy-text={`[${value}]`}
		>
			{value}
		</span>
	)
}

export function CardTextSymbol({ name }: { name: CardTextSymbolName }) {
	const mask = `url("${CARD_TEXT_SYMBOL_PATHS[name]}") center / contain no-repeat`
	const style = { mask, WebkitMask: mask } satisfies CSSProperties

	return (
		<span
			aria-label={`[${name}]`}
			className="mx-0.5 inline-block size-5 bg-current align-text-bottom"
			data-copy-text={`[${name}]`}
			role="img"
			style={style}
		/>
	)
}

export function Exhaust() {
	return <CardTextSymbol name="Exhaust" />
}

export function Might() {
	return <CardTextSymbol name="Might" />
}

type RuneName = (typeof RUNE_NAMES)[number]

function createRuneComponent(name: RuneName) {
	return function Rune() {
		return (
			<img
				alt={`[${name}]`}
				src={`/images/rune_${name.toLowerCase()}.svg`}
				className="mx-0.5 my-0! inline size-5"
				data-copy-text={`[${name}]`}
			/>
		)
	}
}

export const RUNES =
	// SAFETY: RUNE_NAMES is the exhaustive key set, and the mapping emits one component for each rune.
	Object.fromEntries(RUNE_NAMES.map((name) => [name, createRuneComponent(name)])) as {
		[K in RuneName]: ReturnType<typeof createRuneComponent>
	}

export function Universal({ label = 'Power' }: { label?: 'Power' | 'Universal' }) {
	return (
		<img
			alt={`[${label}]`}
			src="/images/rune_rainbow.svg"
			className="-m-0.5! inline h-lh"
			data-copy-text={`[${label}]`}
		/>
	)
}
