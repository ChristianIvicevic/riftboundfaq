import { describe, expect, test } from 'vitest'
import { getPageImageData } from '@/app/og/[...slug]/page-image-data'

const NO_SET_LOGOS: Readonly<Record<string, string>> = {}

function noSetLogo(editionName: string) {
	return NO_SET_LOGOS[editionName]
}

function setLogoSrc(editionName: string) {
	return `set-logo-${editionName.toLowerCase()}`
}

function page(url: string, title: string, description = `Description for ${title}.`) {
	return { url, data: { title, description } }
}

describe('getPageImageData', () => {
	test.each([
		['/about-riftbound-faq', 'About Riftbound FAQ'],
		['/the-future-of-riftbound-faq', 'The Future of Riftbound FAQ'],
		['/rulings/card-text-updates', 'Card Text Updates (Errata)'],
		['/rules-documents', 'Rules Documents'],
		['/rules-documents/tournament-infractions', 'Tournament Infractions'],
	])('uses the shared site-mark composition for %s', (url, title) => {
		expect(getPageImageData(page(url, title), noSetLogo)).toEqual({
			title,
			description: `Description for ${title}.`,
			visual: { kind: 'site-mark' },
		})
	})

	test('uses the curated home-page title and description', () => {
		expect(getPageImageData(page('/', 'Riftbound FAQ'), noSetLogo)).toEqual({
			title: 'Rulings and Rules References',
			description: 'Unofficial rulings, rules references, and card errata for Riftbound players and judges.',
			visual: { kind: 'site-mark' },
		})
	})

	test('maps card catalog art', () => {
		const data = getPageImageData(page('/rulings/cards/abandoned-hall', 'Abandoned Hall'), noSetLogo)

		expect(data).toEqual({
			title: 'Abandoned Hall',
			description: 'Description for Abandoned Hall.',
			visual: {
				kind: 'card',
				src: expect.stringContaining('-1039x744.png'),
				width: 1039,
				height: 744,
			},
		})
	})

	test.each([
		{
			url: '/rulings/general-rules/chain-and-priority',
			title: 'Chain and Priority',
			visual: { kind: 'site-mark' },
		},
		{
			url: '/rulings/mechanics/deathknell',
			title: 'Deathknell',
			visual: {
				kind: 'keyword',
				label: 'Deathknell',
				backgroundColor: '#95b229',
				accentColor: '#b8d343',
			},
		},
		{
			url: '/rulings/mechanics/equipment',
			title: 'Equipment',
			visual: { kind: 'site-mark' },
		},
	])('maps $url to its rendered visual', ({ title, url, visual }) => {
		expect(getPageImageData(page(url, title), noSetLogo)).toEqual({
			title,
			description: `Description for ${title}.`,
			visual,
		})
	})

	test('maps Tournament Rules references and changes to the shared site mark', () => {
		expect(
			getPageImageData(
				page('/rules-documents/tournament-rules/2026-10-09', 'Tournament Rules (October 9, 2026)'),
				noSetLogo,
			),
		).toEqual({
			title: 'Tournament Rules (October 2026)',
			description: 'Description for Tournament Rules (October 9, 2026).',
			visual: { kind: 'site-mark' },
		})
		expect(
			getPageImageData(
				page(
					'/rules-documents/tournament-rules/changes/2026-10-09',
					'Tournament Rules Changes (October 9, 2026)',
				),
				noSetLogo,
			),
		).toEqual({
			title: 'Tournament Rules Changes (October 2026)',
			description: 'Description for Tournament Rules Changes (October 9, 2026).',
			visual: { kind: 'site-mark' },
		})
	})

	test('maps Core Rules references without a set logo to the edition fallback', () => {
		expect(
			getPageImageData(page('/rules-documents/core-rules/1.0', 'Core Rules 1.0 (Pre-Origins)'), noSetLogo),
		).toEqual({
			title: 'Core Rules 1.0 (Pre-Origins)',
			description: 'Description for Core Rules 1.0 (Pre-Origins).',
			visual: {
				kind: 'rules-edition',
				edition: { name: 'Pre-Origins', logoSrc: undefined },
			},
		})
	})

	test('maps both Core Rules transition logos', () => {
		expect(
			getPageImageData(
				page('/rules-documents/core-rules/changes/1.5', 'Core Rules 1.5 Changes (Radiance)'),
				setLogoSrc,
			),
		).toEqual({
			title: 'Core Rules 1.5 Changes (Radiance)',
			description: 'Description for Core Rules 1.5 Changes (Radiance).',
			visual: {
				kind: 'rules-transition',
				from: { name: 'Vendetta', logoSrc: 'set-logo-vendetta' },
				current: { name: 'Radiance', logoSrc: 'set-logo-radiance' },
			},
		})
	})
})
