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
		{ url: '/card-errata-list', title: 'Card Errata List', kind: 'index-cover' },
		{ url: '/reference', title: 'Rules Documents', kind: 'index-cover' },
		{ url: '/cards/flash', title: 'Flash', kind: 'card' },
		{ url: '/general-rules/targeting', title: 'Targeting', kind: 'general-rules' },
	])('classifies $url as $kind', ({ url, title, kind }) => {
		expect(resolvePageImageTreatment(page(url, title))).toMatchObject({ kind })
	})

	test('uses term vocabulary styling for keyword mechanics', () => {
		expect(resolvePageImageTreatment(page('/mechanics/deathknell', 'Deathknell'))).toEqual({
			kind: 'mechanic-keyword',
			keyword: {
				backgroundColor: '#95b229',
				textColor: '#090909',
				accentColor: '#b8d343',
				fontSize: '64px',
			},
		})
	})

	test('uses the generic mechanics cover for non-keyword topics', () => {
		expect(resolvePageImageTreatment(page('/mechanics/equipment', 'Equipment'))).toEqual({
			kind: 'mechanic-topic',
		})
	})

	test('uses concise reference labels for the Card Errata cover', () => {
		expect(resolvePageImageTreatment(page('/card-errata-list', 'Card Errata List'))).toEqual({
			kind: 'index-cover',
			eyebrow: 'REFERENCE',
			coverAccent: 'ERRATA',
			coverAccentFontSize: '88px',
		})
	})

	test('derives Core Rules covers and transitions from the manifest', () => {
		expect(resolvePageImageTreatment(page('/reference/core-rules/1.5'))).toMatchObject({
			kind: 'rules-reference',
			cover: { versionLabel: '1.5', editionLabel: 'RADIANCE' },
		})
		expect(resolvePageImageTreatment(page('/reference/core-rules/changes/1.5'))).toMatchObject({
			kind: 'rules-diff',
			transition: { fromLabel: '1.4', toLabel: '1.5' },
		})
	})

	test('formats Tournament Rules covers and transitions without day precision', () => {
		const referencePage = page('/reference/tournament-rules/2026-10-09', 'Tournament Rules (2026-10-09)')
		const referenceTreatment = resolvePageImageTreatment(referencePage)
		expect(referenceTreatment).toMatchObject({
			kind: 'rules-reference',
			displayTitle: 'Tournament Rules (October 2026)',
			cover: { versionLabel: 'OCTOBER', editionLabel: '2026' },
		})
		expect(getPageImageDisplayTitle(referencePage, referenceTreatment)).toBe(
			'Tournament Rules (October 2026)',
		)
		expect(resolvePageImageTreatment(page('/reference/tournament-rules/changes/2026-10-09'))).toMatchObject({
			kind: 'rules-diff',
			displayTitle: 'Tournament Rules Changes (October 2026)',
			transition: { fromLabel: 'JUL 2026', toLabel: 'OCT 2026' },
		})
	})

	test('rejects pages without a visual treatment', () => {
		expect(() => resolvePageImageTreatment(page('/unexpected'))).toThrow(
			'Unclassified page image "/unexpected"',
		)
	})
})
