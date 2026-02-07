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
