import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { googleFonts } from 'takumi-js/helpers'
import { ImageResponse } from 'takumi-js/response'
import { getPageImageData, type PageImagePage } from '@/app/og/[...slug]/page-image-data'
import { PageImage } from '@/app/og/[...slug]/page-image-layouts'
import { PAGE_IMAGE_SIZE } from '@/lib/content/page-image'
import { getCoreRulesSetLogo } from '@/lib/rules/core-rules-set-logos'

const SITE_LOGO_DATA = Uint8Array.from(await readFile(join(process.cwd(), 'src', 'app', 'icon.png'))).buffer
const PAGE_IMAGE_FONTS = googleFonts([
	{ name: 'Noto Sans', weight: '100..900' },
	{ name: 'Noto Serif', weight: 900 },
])
const CARD_IMAGE_HOST = 'cmsassets.rgpub.io'
const CARD_IMAGE_FETCH_TIMEOUT_MS = 10_000
const CARD_IMAGE_MAX_BYTES = 8 * 1024 * 1024

export async function createPageImageResponse(page: PageImagePage) {
	const setLogoFiles = new Map<string, string>()
	const setLogoSrc = (editionName: string) => {
		const logo = getCoreRulesSetLogo(editionName)
		if (!logo) return
		const src = `set-logo-${logo.filename.replace(/\.webp$/u, '')}`
		setLogoFiles.set(src, logo.filename)
		return src
	}
	const data = getPageImageData(page, setLogoSrc)
	const setLogoSources = await Promise.all(
		[...setLogoFiles].map(async ([src, filename]) => ({
			src,
			data: Uint8Array.from(await readFile(join(process.cwd(), 'public', 'images', 'sets', filename))).buffer,
		})),
	)

	return new ImageResponse(<PageImage data={data} logoSrc="site-logo" />, {
		...PAGE_IMAGE_SIZE,
		fonts: PAGE_IMAGE_FONTS,
		fontFamilies: ['Noto Sans', 'Noto Serif'],
		images: {
			sources: [
				{ src: 'site-logo', data: () => SITE_LOGO_DATA },
				...setLogoSources.map(({ data: logoData, src }) => ({ src, data: () => logoData })),
			],
			timeout: CARD_IMAGE_FETCH_TIMEOUT_MS,
			maxBytes: CARD_IMAGE_MAX_BYTES,
			allowUrl: (url) => new URL(url).hostname === CARD_IMAGE_HOST,
		},
	})
}
