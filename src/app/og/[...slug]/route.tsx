import { notFound } from 'next/navigation'
import { createPageImageResponse } from '@/app/og/[...slug]/page-image'
import { getPageImage, source } from '@/lib/content/source'

export async function GET(_req: Request, { params }: RouteContext<'/og/[...slug]'>) {
	const { slug } = await params
	if (slug.at(-1) !== 'image.png') notFound()

	const page = source.getPage(slug.slice(0, -1))
	if (!page) notFound()
	return createPageImageResponse(page)
}

export function generateStaticParams() {
	return source.getPages().map((page) => ({
		slug: getPageImage(page).segments,
	}))
}
