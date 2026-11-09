import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { PageImage, type PageImageData } from '@/app/og/[...slug]/page-image-layouts'

function render(data: PageImageData) {
	return renderToStaticMarkup(<PageImage data={data} logoSrc="site-logo" />)
}

describe('PageImage', () => {
	test('uses the site mark in both the branded spine and landing visual', () => {
		const markup = render({
			title: 'About Riftbound FAQ',
			description: 'About the project.',
			railLabel: 'LANDING',
			visual: { kind: 'site-mark' },
		})

		expect(markup.match(/src="site-logo"/gu)).toHaveLength(2)
		expect(markup).toContain(
			'width="430" height="430" style="position:absolute;top:112px;right:-18px;object-fit:contain;opacity:0.2;transform:rotate(7deg)"',
		)
		expect(markup).toContain('width:104px;height:100%;background-color:#f4cc52')
		expect(markup).toContain('>RIFTBOUND FAQ<')
		expect(markup).not.toContain('>LANDING<')
	})

	test('uses the site mark instead of repeating generic wordmark copy', () => {
		const markup = render({
			title: 'Game Mechanics',
			description: 'Mechanics reference pages.',
			railLabel: 'MECHANIC',
			visual: { kind: 'wordmark', primary: 'Game', accent: 'Mechanics' },
		})

		expect(markup.match(/src="site-logo"/gu)).toHaveLength(2)
		expect(markup).not.toContain('>GAME<')
		expect(markup).not.toContain('>MECHANICS<')
	})

	test('pulls landscape card art out without repeating the card name in the rail', () => {
		const markup = render({
			title: 'Abandoned Hall',
			description: 'An example battlefield.',
			railLabel: 'CARD RULINGS',
			visual: { kind: 'card', src: 'card-image', width: 1039, height: 744 },
		})

		expect(markup).toContain(
			'width="640" height="458" style="position:absolute;right:-120px;bottom:34px;object-fit:contain;opacity:0.64;transform:rotate(4deg);filter:saturate(0.86)"',
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
			'width="535" height="747" style="position:absolute;right:-50px;bottom:-245px;object-fit:contain;opacity:0.64;transform:rotate(6deg);filter:saturate(0.86)"',
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
		expect(markup).toContain('right:20px;bottom:56px;flex-direction:column')
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
		expect(markup).toContain('width="295" height="180"')
		expect(markup).toContain('right:36px;bottom:38px;align-items:center')
		expect(markup).not.toContain('>CORE RULES<')
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
		expect(markup).toContain('width="220" height="132"')
		expect(markup).toContain('src="set-logo-radiance"')
		expect(markup).toContain('width="295" height="180"')
		expect(markup).toContain('opacity:0.38')
		expect(markup).toContain('opacity:0.96')
		expect(markup).toContain('filter:grayscale(1)')
		expect(markup).toContain('left:250px;width:3px;height:90px;background-color:#f4cc52')
		expect(markup).not.toContain('>TO<')
	})

	test.each([
		['Flow', 'Brief description.', 78, 29],
		[
			'About Riftbound FAQ',
			'Unofficial Riftbound rules answers about abilities, with examples and Core Rules citations.',
			74,
			30,
		],
		[
			'Rulings and Rules References',
			'Unofficial Riftbound rulings for Kennen, Storm of Shuriken, with rules explanations, examples, and Core Rules citations.',
			71,
			29,
		],
		['Core Rules 1.5 Changes (Radiance)', 'Changes between adjacent Core Rules documents.', 60, 29],
		[
			'Tournament Rules Changes (October 2026)',
			"Unofficial, hyperlinked versions of Riftbound's Core Rules and Tournament Rules, with archived versions and generated comparisons between adjacent versions.",
			52,
			27,
		],
	])(
		'scales %s according to title and description density',
		(title, description, expectedTitleSize, expectedDescriptionSize) => {
			const markup = render({ title, description, railLabel: 'TEST', visual: { kind: 'site-mark' } })

			expect(markup).toContain(`font-size:${expectedTitleSize}px`)
			expect(markup).toContain(`font-size:${expectedDescriptionSize}px`)
			expect(markup).toContain('text-wrap:balance')
			expect(markup).toContain('text-wrap:pretty')
		},
	)

	test('keeps Tournament Rules together when balancing long titles', () => {
		const markup = render({
			title: 'Tournament Rules Changes (October 2026)',
			description: 'Changes between adjacent Tournament Rules documents.',
			railLabel: 'TOURNAMENT RULES · CHANGES',
			visual: { kind: 'site-mark' },
		})

		expect(markup).toContain('Tournament\u00A0Rules Changes')
	})
})
