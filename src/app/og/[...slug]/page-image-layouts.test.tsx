import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { PageImage, type PageImageData } from '@/app/og/[...slug]/page-image-layouts'

function render(data: PageImageData) {
	return renderToStaticMarkup(<PageImage data={data} logoSrc="site-logo" />)
}

describe('PageImage', () => {
	test('uses the site mark as both the brand and landing visual', () => {
		const markup = render({
			title: 'About Riftbound FAQ',
			description: 'About the project.',
			railLabel: 'RIFTBOUND FAQ',
			visual: { kind: 'site-mark' },
		})

		expect(markup.match(/src="site-logo"/gu)).toHaveLength(2)
		expect(markup).toContain('border-bottom:18px solid #f4cc52')
		expect(markup).toContain(
			'width="390" height="390" style="position:absolute;top:135px;right:-18px;object-fit:contain;opacity:0.22;transform:rotate(6deg)"',
		)
		expect(markup).not.toContain('>ABOUT RIFTBOUND FAQ<')
	})

	test('pulls landscape card art out without repeating the card name in the rail', () => {
		const markup = render({
			title: 'Abandoned Hall',
			description: 'An example battlefield.',
			railLabel: 'CARD RULINGS',
			visual: { kind: 'card', src: 'card-image', width: 1039, height: 744 },
		})

		expect(markup).toContain(
			'width="600" height="430" style="position:absolute;right:-90px;bottom:-25px;object-fit:contain;opacity:0.58;transform:rotate(3deg);filter:saturate(0.82)"',
		)
		expect(markup).not.toContain('>ABANDONED HALL<')
	})

	test('pulls portrait card art down and to the right', () => {
		const markup = render({
			title: 'Akali, Brash',
			description: 'An example unit.',
			railLabel: 'CARD RULINGS',
			visual: { kind: 'card', src: 'card-image', width: 744, height: 1039 },
		})

		expect(markup).toContain(
			'width="500" height="698" style="position:absolute;right:-36px;bottom:-240px;object-fit:contain;opacity:0.58;transform:rotate(5deg);filter:saturate(0.82)"',
		)
	})

	test('renders keyword mechanics as slash-delimited marks', () => {
		const markup = render({
			title: 'Deathknell',
			description: 'An example mechanic.',
			railLabel: 'MECHANIC · KEYWORD',
			railContext: 'Deathknell',
			visual: {
				kind: 'keyword',
				label: 'Deathknell',
				backgroundColor: '#95b229',
				accentColor: '#b8d343',
			},
		})

		expect(markup).toContain('/DEATHKNELL/')
		expect(markup).toContain('KEYWORD ABILITY')
	})

	test('renders a set logo for a Core Rules reference', () => {
		const markup = render({
			title: 'Core Rules 1.5 (Radiance)',
			description: 'The current Core Rules.',
			railLabel: 'CORE RULES · REFERENCE',
			railContext: 'Radiance · 1.5',
			visual: {
				kind: 'rules-edition',
				edition: { name: 'Radiance', version: '1.5', logoSrc: 'set-logo-radiance' },
			},
		})

		expect(markup).toContain('src="set-logo-radiance"')
		expect(markup).toContain('CORE RULES')
	})

	test('falls back to an edition wordmark when no Core Rules set logo exists', () => {
		const markup = render({
			title: 'Core Rules 1.0 (Pre-Origins)',
			description: 'Archived Core Rules.',
			railLabel: 'CORE RULES · REFERENCE',
			railContext: 'Pre-Origins · 1.0',
			visual: {
				kind: 'rules-edition',
				edition: { name: 'Pre-Origins', version: '1.0' },
			},
		})

		expect(markup).toContain('PRE-ORIGINS')
		expect(markup).not.toContain('set-logo-pre-origins')
	})

	test('renders both Core Rules transition logos with the previous logo muted', () => {
		const markup = render({
			title: 'Core Rules 1.5 Changes (Radiance)',
			description: 'Changes between two editions.',
			railLabel: 'CORE RULES · CHANGES',
			railContext: 'Vendetta · 1.4 TO Radiance · 1.5',
			visual: {
				kind: 'rules-transition',
				from: { name: 'Vendetta', version: '1.4', logoSrc: 'set-logo-vendetta' },
				current: { name: 'Radiance', version: '1.5', logoSrc: 'set-logo-radiance' },
			},
		})

		expect(markup).toContain('src="set-logo-vendetta"')
		expect(markup).toContain('width="250" height="118"')
		expect(markup).toContain('src="set-logo-radiance"')
		expect(markup).toContain('width="335" height="160"')
		expect(markup).toContain('opacity:0.4;filter:grayscale(1)')
		expect(markup).toContain('opacity:0.88')
		expect(markup).toContain('filter:grayscale(1)')
		expect(markup).toContain('transform:rotate(-9deg)')
		expect(markup).toContain('>TO<')
	})
})
