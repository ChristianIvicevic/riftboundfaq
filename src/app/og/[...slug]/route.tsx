import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { notFound } from 'next/navigation'
import { ImageResponse } from 'takumi-js/response'
import { generate as DefaultImage } from '@/components/takumi'
import { getPageDescription } from '@/lib/content/page-description'
import { getPageImage, PAGE_IMAGE_SIZE, source } from '@/lib/content/source'
import { SITE_NAME } from '@/lib/site'

export async function GET(_req: Request, { params }: RouteContext<'/og/[...slug]'>) {
	const { slug } = await params
	if (slug.at(-1) !== 'image.png') notFound()

	const page = source.getPage(slug.slice(0, -1))
	if (!page) notFound()

	const logoData = readFile(join(process.cwd(), 'src', 'app', 'icon.png')).then(
		(buffer) => Uint8Array.from(buffer).buffer,
	)

	return new ImageResponse(
		<DefaultImage
			title={page.data.title}
			description={getPageDescription(page)}
			site={SITE_NAME}
			icon={<img src="logo" alt="" width={56} height={56} style={{ objectFit: 'contain' }} />}
			primaryColor="#f4cc52"
			primaryTextColor="#f4cc52"
		/>,
		{ ...PAGE_IMAGE_SIZE, images: [{ src: 'logo', data: () => logoData }] },
	)
}

export function generateStaticParams() {
	return source.getPages().map((page) => ({
		slug: getPageImage(page).segments,
	}))
}
