export function shouldShowSourceDetails(url: string) {
	return url !== '/reference' && !url.startsWith('/reference/')
}
