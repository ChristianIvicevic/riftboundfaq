import { describe, expect, test, vi } from 'vitest'
import { getPageImageData } from '@/app/og/[...slug]/page-image-data'

const NO_SET_LOGOS: Readonly<Record<string, string>> = {}

function noSetLogo(editionName: string) {
	return NO_SET_LOGOS[editionName]
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
	])('uses the shared site-mark composition for %s', (url, title) => {
		expect(getPageImageData(page(url, title), noSetLogo)).toEqual({
			title,
			description: `Description for ${title}.`,
			railLabel: 'RIFTBOUND FAQ',
			visual: { kind: 'site-mark' },
		})
	})

	test('uses the curated home-page title and description', () => {
		expect(getPageImageData(page('/', 'Riftbound FAQ'), noSetLogo)).toEqual({
			title: 'Rulings and Rules References',
			description: 'Unofficial rulings, rules references, and card errata for Riftbound players and judges.',
			railLabel: 'RIFTBOUND FAQ',
			visual: { kind: 'site-mark' },
		})
	})

	test('maps card catalog art without repeating the card name in the rail', () => {
		const data = getPageImageData(page('/rulings/cards/abandoned-hall', 'Abandoned Hall'), noSetLogo)

		expect(data).toMatchObject({
			title: 'Abandoned Hall',
			railLabel: 'CARD RULINGS',
			visual: {
				kind: 'card',
				src: expect.stringContaining('-1039x744.png'),
				width: 1039,
				height: 744,
			},
		})
		expect(data).not.toHaveProperty('railContext')
	})

	test.each([
		{
			url: '/rulings/general-rules/chain-and-priority',
			title: 'Chain and Priority',
			railLabel: 'GENERAL RULES',
			visual: { kind: 'wordmark', primary: 'General', accent: 'Rules' },
		},
		{
			url: '/rulings/mechanics/deathknell',
			title: 'Deathknell',
			railLabel: 'MECHANIC · KEYWORD',
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
			railLabel: 'MECHANIC',
			visual: { kind: 'wordmark', primary: 'Game', accent: 'Mechanics' },
		},
	])('maps $url to its semantic visual', ({ railLabel, title, url, visual }) => {
		expect(getPageImageData(page(url, title), noSetLogo)).toMatchObject({
			railLabel,
			railContext: title,
			visual,
		})
	})

	test('maps Tournament Rules references and changes to the exact shared site mark', () => {
		expect(
			getPageImageData(
				page('/rules-documents/tournament-rules/2026-10-09', 'Tournament Rules (October 9, 2026)'),
				noSetLogo,
			),
		).toMatchObject({
			title: 'Tournament Rules (October 2026)',
			railLabel: 'TOURNAMENT RULES · REFERENCE',
			railContext: 'OCTOBER · 2026',
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
		).toMatchObject({
			title: 'Tournament Rules Changes (October 2026)',
			railLabel: 'TOURNAMENT RULES · CHANGES',
			railContext: 'JUL · 2026 TO OCT · 2026',
			visual: { kind: 'site-mark' },
		})
	})

	test('maps Core Rules references without a set logo to the wordmark fallback', () => {
		const setLogoSrc = vi.fn(noSetLogo)

		expect(
			getPageImageData(page('/rules-documents/core-rules/1.0', 'Core Rules 1.0 (Pre-Origins)'), setLogoSrc),
		).toMatchObject({
			railLabel: 'CORE RULES · REFERENCE',
			railContext: 'Pre-Origins · 1.0',
			visual: {
				kind: 'rules-edition',
				edition: { name: 'Pre-Origins', version: '1.0', logoSrc: undefined },
			},
		})
		expect(setLogoSrc).toHaveBeenCalledExactlyOnceWith('Pre-Origins')
	})

	test('maps both Core Rules transition logos', () => {
		const setLogoSrc = vi.fn((editionName: string) => `set-logo-${editionName.toLowerCase()}`)

		expect(
			getPageImageData(
				page('/rules-documents/core-rules/changes/1.5', 'Core Rules 1.5 Changes (Radiance)'),
				setLogoSrc,
			),
		).toMatchObject({
			railLabel: 'CORE RULES · CHANGES',
			railContext: 'Vendetta · 1.4 TO Radiance · 1.5',
			visual: {
				kind: 'rules-transition',
				from: { name: 'Vendetta', version: '1.4', logoSrc: 'set-logo-vendetta' },
				current: { name: 'Radiance', version: '1.5', logoSrc: 'set-logo-radiance' },
			},
		})
		expect(setLogoSrc).toHaveBeenNthCalledWith(1, 'Vendetta')
		expect(setLogoSrc).toHaveBeenNthCalledWith(2, 'Radiance')
	})
})
