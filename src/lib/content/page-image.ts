export const PAGE_IMAGE_SIZE = { width: 1200, height: 630 } as const

export function getPageImage(page: { slugs: readonly string[] }) {
	const segments = [...page.slugs, 'image.png']
	return { segments, url: `/og/${segments.join('/')}?v=2026-11-09` }
}
