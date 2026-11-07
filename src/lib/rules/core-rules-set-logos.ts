export type CoreRulesSetLogo = Readonly<{
	filename: string
	src: string
	width: number
	height: number
}>

export const CORE_RULES_SET_LOGOS = {
	Origins: { filename: 'origins.webp', src: '/images/sets/origins.webp', width: 300, height: 75 },
	Spiritforged: {
		filename: 'spiritforged.webp',
		src: '/images/sets/spiritforged.webp',
		width: 339,
		height: 92,
	},
	Unleashed: { filename: 'unleashed.webp', src: '/images/sets/unleashed.webp', width: 395, height: 134 },
	Vendetta: { filename: 'vendetta.webp', src: '/images/sets/vendetta.webp', width: 322, height: 118 },
	Radiance: { filename: 'radiance.webp', src: '/images/sets/radiance.webp', width: 300, height: 74 },
} satisfies Readonly<Record<string, CoreRulesSetLogo>>

const CORE_RULES_SET_LOGOS_BY_NAME = new Map(Object.entries(CORE_RULES_SET_LOGOS))

export function getCoreRulesSetLogo(name: string | null | undefined) {
	return name ? CORE_RULES_SET_LOGOS_BY_NAME.get(name) : undefined
}
