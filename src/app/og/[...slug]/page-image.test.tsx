import { describe, expect, test } from 'vitest'
import { createPageImageResponse } from '@/app/og/[...slug]/page-image'
import { PAGE_IMAGE_SIZE } from '@/lib/content/page-image'

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function page(url: string, title: string) {
	return { url, data: { title, description: `Description for ${title}.` } }
}

describe('createPageImageResponse', () => {
	test.each([
		['site mark', page('/about-riftbound-faq', 'About Riftbound FAQ')],
		['keyword', page('/rulings/mechanics/deathknell', 'Deathknell')],
		[
			'Core Rules set-logo transition',
			page('/rules-documents/core-rules/changes/1.5', 'Core Rules 1.5 Changes (Radiance)'),
		],
		['Core Rules no-logo fallback', page('/rules-documents/core-rules/1.0', 'Core Rules 1.0 (Pre-Origins)')],
	])('renders a valid PNG for the %s treatment', async (_name, imagePage) => {
		const response = await createPageImageResponse(imagePage)

		await response.ready
		expect(response.headers.get('content-type')).toBe('image/png')

		const png = new Uint8Array(await response.arrayBuffer())
		expect([...png.subarray(0, PNG_SIGNATURE.length)]).toEqual(PNG_SIGNATURE)
		expect(new TextDecoder().decode(png.subarray(12, 16))).toBe('IHDR')

		const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
		expect(view.getUint32(16)).toBe(PAGE_IMAGE_SIZE.width)
		expect(view.getUint32(20)).toBe(PAGE_IMAGE_SIZE.height)
	})
})
