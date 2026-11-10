import { describe, expect, test } from 'vitest'
import { getPageImageDisplayTitle, resolvePageImageTreatment } from '@/app/og/[...slug]/page-image-treatment'

function page(url: string, title = 'Example') {
	return { url, data: { title } }
}

describe('resolvePageImageTreatment', () => {
	test.each([
		{ url: '/', title: 'About', kind: 'landing' },
		{ url: '/about-riftbound-faq', title: 'About Riftbound FAQ', kind: 'landing' },
		{ url: '/the-future-of-riftbound-faq', title: 'The Future', kind: 'editorial' },
		{ url: '/rulings/card-errata-list', title: 'Card Errata List', kind: 'index-cover' },
		{ url: '/rules-documents', title: 'Rules Documents', kind: 'index-cover' },
		{ url: '/rulings/cards/flash', title: 'Flash', kind: 'card' },
		{ url: '/rulings/general-rules/targeting', title: 'Targeting', kind: 'general-rules' },
	])('classifies $url as $kind', ({ url, title, kind }) => {
		expect(resolvePageImageTreatment(page(url, title))).toMatchObject({ kind })
	})

	test('uses term vocabulary styling for keyword mechanics', () => {
		expect(resolvePageImageTreatment(page('/rulings/mechanics/deathknell', 'Deathknell'))).toEqual({
			kind: 'mechanic-keyword',
			keyword: {
				backgroundColor: '#95b229',
				accentColor: '#b8d343',
			},
		})
	})

	test('uses the generic mechanics cover for non-keyword topics', () => {
		expect(resolvePageImageTreatment(page('/rulings/mechanics/equipment', 'Equipment'))).toEqual({
			kind: 'mechanic-topic',
		})
	})

	test('derives Core Rules covers and transitions from the manifest', () => {
		expect(resolvePageImageTreatment(page('/rules-documents/core-rules/1.5'))).toMatchObject({
			kind: 'rules-reference',
			cover: {
				kind: 'core-rules',
				versionLabel: '1.5',
				editionName: 'Radiance',
			},
		})
		expect(resolvePageImageTreatment(page('/rules-documents/core-rules/changes/1.5'))).toMatchObject({
			kind: 'rules-diff',
			transition: {
				kind: 'core-rules',
				fromLabel: '1.4',
				toLabel: '1.5',
				fromEditionName: 'Vendetta',
				toEditionName: 'Radiance',
			},
		})
	})

	test('formats Tournament Rules covers and transitions without day precision', () => {
		const referencePage = page(
			'/rules-documents/tournament-rules/2026-10-09',
			'Tournament Rules (2026-10-09)',
		)
		const referenceTreatment = resolvePageImageTreatment(referencePage)
		expect(referenceTreatment).toMatchObject({
			kind: 'rules-reference',
			displayTitle: 'Tournament Rules (October 2026)',
			cover: { kind: 'generic', versionLabel: 'OCTOBER', editionLabel: '2026' },
		})
		expect(getPageImageDisplayTitle(referencePage, referenceTreatment)).toBe(
			'Tournament Rules (October 2026)',
		)
		expect(
			resolvePageImageTreatment(page('/rules-documents/tournament-rules/changes/2026-10-09')),
		).toMatchObject({
			kind: 'rules-diff',
			displayTitle: 'Tournament Rules Changes (October 2026)',
			transition: { kind: 'generic', fromLabel: 'JUL 2026', toLabel: 'OCT 2026' },
		})
	})

	test('rejects pages without a visual treatment', () => {
		expect(() => resolvePageImageTreatment(page('/unexpected'))).toThrow(
			'Unclassified page image "/unexpected"',
		)
	})
})
