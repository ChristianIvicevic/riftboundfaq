import { generate as DefaultImage } from 'fumadocs-ui/og'
import { notFound } from 'next/navigation'
import { ImageResponse } from 'next/og'
import { getPageImage, source } from '@/lib/source'

export const revalidate = false

export async function GET(_req: Request, { params }: RouteContext<'/og/[...slug]'>) {
	const { slug } = await params
	const page = source.getPage(slug.slice(0, -1))
	if (!page) notFound()

	return new ImageResponse(
		<DefaultImage
			title={page.data.title}
			description={
				page.data.description ||
				(page.data.title
					? `FAQ and rules reference for ${page.data.title} in Riftbound`
					: 'Community-driven FAQ for Riftbound judges and players')
			}
			site="Riftbound FAQ"
			primaryColor="#123456"
			primaryTextColor="#ABCDEF"
		/>,
		{ width: 1200, height: 630 },
	)
}

export function generateStaticParams() {
	return source.getPages().map((page) => ({
		lang: page.locale,
		slug: getPageImage(page).segments,
	}))
}
