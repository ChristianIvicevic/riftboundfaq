import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { PageImage, type PageImageData } from '@/app/og/[...slug]/page-image-layouts'

function render(data: PageImageData) {
	return renderToStaticMarkup(<PageImage data={data} logoSrc="site-logo" />)
}

function imageMarkup(markup: string, src: string) {
	const image = (markup.match(/<img\b[^>]*>/gu) ?? []).find((candidate) => candidate.includes(`src="${src}"`))
	if (!image) throw new Error(`Missing image ${JSON.stringify(src)}`)
	return image
}

describe('PageImage', () => {
	test('renders the site mark, brand, title, and description', () => {
		const markup = render({
			title: 'About Riftbound FAQ',
			description: 'About the project.',
			visual: { kind: 'site-mark' },
		})

		expect(markup.match(/src="site-logo"/gu)).toHaveLength(2)
		expect(markup).toContain('>RIFTBOUND FAQ<')
		expect(markup).toContain('>About Riftbound FAQ<')
		expect(markup).toContain('>About the project.<')
		expect(markup).toContain('font-family:Noto Serif')
		expect(markup).toContain('background-color:#ef7d00')
	})

	test('positions landscape card art to the right', () => {
		const markup = render({
			title: 'Abandoned Hall',
			description: 'An example battlefield.',
			visual: { kind: 'card', src: 'card-image', width: 1039, height: 744 },
		})
		const card = imageMarkup(markup, 'card-image')

		expect(card).toContain('width="640" height="458"')
		expect(card).toContain('right:-120px')
		expect(card).toContain('bottom:34px')
		expect(card).toContain('rotate(4deg)')
	})

	test('positions portrait card art down and to the right', () => {
		const markup = render({
			title: 'Akali, Brash',
			description: 'An example unit.',
			visual: { kind: 'card', src: 'card-image', width: 744, height: 1039 },
		})
		const card = imageMarkup(markup, 'card-image')

		expect(card).toContain('width="535" height="747"')
		expect(card).toContain('right:-50px')
		expect(card).toContain('bottom:-245px')
		expect(card).toContain('rotate(6deg)')
	})

	test('renders keyword mechanics as slash-delimited marks', () => {
		const markup = render({
			title: 'Deathknell',
			description: 'An example mechanic.',
			visual: {
				kind: 'keyword',
				label: 'Deathknell',
				backgroundColor: '#95b229',
				accentColor: '#b8d343',
			},
		})

		expect(markup).toContain('/DEATHKNELL/')
		expect(markup).toContain('KEYWORD ABILITY')
		expect(markup).toContain('background-color:#95b229')
		expect(markup).toContain('color:#b8d343')
	})

	test('renders a set logo for a Core Rules reference', () => {
		const markup = render({
			title: 'Core Rules 1.5 (Radiance)',
			description: 'The current Core Rules.',
			visual: {
				kind: 'rules-edition',
				edition: { name: 'Radiance', logoSrc: 'set-logo-radiance' },
			},
		})
		const logo = imageMarkup(markup, 'set-logo-radiance')

		expect(logo).toContain('width="295" height="180"')
		expect(markup).not.toContain('>RADIANCE<')
	})

	test('falls back to an edition wordmark when no Core Rules set logo exists', () => {
		const markup = render({
			title: 'Core Rules 1.0 (Pre-Origins)',
			description: 'Archived Core Rules.',
			visual: {
				kind: 'rules-edition',
				edition: { name: 'Pre-Origins' },
			},
		})

		expect(markup).toContain('>PRE-ORIGINS<')
	})

	test('renders both Core Rules transition logos with the previous logo muted', () => {
		const markup = render({
			title: 'Core Rules 1.5 Changes (Radiance)',
			description: 'Changes between two editions.',
			visual: {
				kind: 'rules-transition',
				from: { name: 'Vendetta', logoSrc: 'set-logo-vendetta' },
				current: { name: 'Radiance', logoSrc: 'set-logo-radiance' },
			},
		})

		expect(imageMarkup(markup, 'set-logo-vendetta')).toContain('opacity:0.38')
		expect(imageMarkup(markup, 'set-logo-radiance')).toContain('opacity:0.96')
		expect(markup).toContain('filter:grayscale(1)')
	})

	test.each([
		[12, 78],
		[13, 74],
		[24, 74],
		[25, 71],
		[31, 71],
		[32, 60],
		[38, 60],
		[39, 52],
	])('uses the expected title size for a %i-character title', (length, expectedSize) => {
		const markup = render({
			title: 'T'.repeat(length),
			description: 'Brief description.',
			visual: { kind: 'site-mark' },
		})

		expect(markup).toContain(`font-size:${expectedSize}px`)
	})

	test.each([
		[80, 29],
		[81, 30],
		[105, 30],
		[106, 29],
		[130, 29],
		[131, 27],
	])('uses the expected description size for %i characters', (length, expectedSize) => {
		const markup = render({
			title: 'Page title',
			description: 'D'.repeat(length),
			visual: { kind: 'site-mark' },
		})

		expect(markup).toContain(`font-size:${expectedSize}px`)
	})

	test('keeps Tournament Rules together when balancing long titles', () => {
		const markup = render({
			title: 'Tournament Rules Changes (October 2026)',
			description: 'Changes between adjacent Tournament Rules documents.',
			visual: { kind: 'site-mark' },
		})

		expect(markup).toContain('Tournament\u00A0Rules Changes')
	})
})
