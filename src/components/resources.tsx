export function Energy({ value }: { value: number }) {
	return (
		<span className="mx-0.5 inline-flex size-5 items-center justify-center rounded-full bg-black p-2 text-xs font-bold text-white tabular-nums dark:bg-white dark:text-black">
			{value}
		</span>
	)
}

const RUNE_NAMES = ['Fury', 'Calm', 'Mind', 'Body', 'Chaos', 'Order'] as const

type RuneName = (typeof RUNE_NAMES)[number]

function createRuneComponent(name: RuneName) {
	return function Rune() {
		return (
			<img alt={name} src={`/images/rune_${name.toLowerCase()}.svg`} className="mx-0.5 my-0! inline h-lh" />
		)
	}
}

export const RUNES = Object.fromEntries(RUNE_NAMES.map((name) => [name, createRuneComponent(name)])) as {
	[K in RuneName]: ReturnType<typeof createRuneComponent>
}

export function Universal() {
	return <img alt="Universal" src="/images/rune_rainbow.svg" className="-m-0.5! inline h-lh" />
}
