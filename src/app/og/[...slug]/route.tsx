import { generate as DefaultImage } from 'fumadocs-ui/og'
import { notFound } from 'next/navigation'
import { ImageResponse } from 'next/og'
import { getPageDescription, getPageImage, source } from '@/lib/content/source'
import { SITE_NAME } from '@/lib/site'

export async function GET(_req: Request, { params }: RouteContext<'/og/[...slug]'>) {
	const { slug } = await params
	const page = source.getPage(slug.slice(0, -1))
	if (!page) notFound()

	return new ImageResponse(
		<DefaultImage
			title={page.data.title}
			description={getPageDescription(page)}
			site={SITE_NAME}
			primaryColor="#123456"
			primaryTextColor="#ABCDEF"
		/>,
		{ width: 1200, height: 630 },
	)
}

export function generateStaticParams() {
	return source.getPages().map((page) => ({
		slug: getPageImage(page).segments,
	}))
}
