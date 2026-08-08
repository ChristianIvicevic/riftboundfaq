export type RulingPageKind = 'card' | 'mechanic' | 'general-rules'

export function getRulingPageKind(url: string): RulingPageKind | undefined {
	if (url.startsWith('/cards/')) return 'card'
	if (url.startsWith('/mechanics/')) return 'mechanic'
	if (url.startsWith('/general-rules/')) return 'general-rules'
}

export function shouldShowSourceDetails(url: string) {
	return url !== '/reference' && !url.startsWith('/reference/')
}

export function isEditorialRulingPage(url: string) {
	return getRulingPageKind(url) !== undefined
}
