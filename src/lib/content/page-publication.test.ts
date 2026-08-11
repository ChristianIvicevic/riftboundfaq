import { describe, expect, test } from 'vitest'
import { getPagePublication } from '@/lib/content/page-publication'
import { SITE_DESCRIPTION, SITE_TITLE } from '@/lib/site'

describe('getPagePublication', () => {
	test('publishes the homepage', () => {
		expect(getPagePublication({ url: '/', data: { title: 'About this site' } })).toEqual({
			metadataTitle: SITE_TITLE,
			description: SITE_DESCRIPTION,
			isEditorial: false,
			isIndexable: true,
			isSourceAttributionEligible: true,
		})
	})

	test.each([
		{
			case: 'card ruling',
			url: '/cards/akshan-mischievous',
			title: 'Akshan, Mischievous',
			metadataTitle: 'Akshan, Mischievous Rulings',
			description:
				'Unofficial Riftbound rulings for Akshan, Mischievous, with rules explanations, examples, and Core Rules citations.',
		},
		{
			case: 'mechanic ruling',
			url: '/mechanics/ambush',
			title: 'Ambush',
			metadataTitle: 'Ambush Rules',
			description:
				'Unofficial answers about the Ambush mechanic in Riftbound, with examples and Core Rules citations.',
		},
		{
			case: 'general-rules ruling',
			url: '/general-rules/chain-and-priority',
			title: 'Chain and Priority',
			metadataTitle: 'Chain and Priority',
			description:
				'Unofficial Riftbound rules answers about chain and priority, with examples and Core Rules citations.',
		},
	])('publishes a $case', ({ url, title, metadataTitle, description }) => {
		expect(getPagePublication({ url, data: { title } })).toEqual({
			metadataTitle,
			description,
			isEditorial: true,
			isIndexable: true,
			isSourceAttributionEligible: true,
		})
	})

	test.each([
		{ case: 'Reference overview', url: '/reference', title: 'Rules Reference' },
		{ case: 'Versioned rules route', url: '/reference/core-rules/1.4', title: 'Core Rules 1.4' },
		{
			case: 'Change page',
			url: '/reference/tournament-rules/changes/2026-07-16',
			title: 'Tournament Rules Changes',
		},
	])('publishes a non-indexable $case without source attribution', ({ url, title }) => {
		expect(
			getPagePublication({
				url,
				data: { title, description: 'Authored reference description.', noindex: true },
			}),
		).toEqual({
			metadataTitle: title,
			description: 'Authored reference description.',
			isEditorial: false,
			isIndexable: false,
			isSourceAttributionEligible: false,
		})
	})

	test.each(['/cards-reference', '/reference-card'])('does not classify the near-miss route %s', (url) => {
		expect(getPagePublication({ url, data: { title: 'Near miss' } })).toEqual({
			metadataTitle: 'Near miss',
			description: SITE_DESCRIPTION,
			isEditorial: false,
			isIndexable: true,
			isSourceAttributionEligible: true,
		})
	})

	test('preserves authored description behavior', () => {
		expect(
			getPagePublication({
				url: '/cards/flash',
				data: { title: 'Flash', description: 'An authored description.' },
			}).description,
		).toBe('An authored description.')

		expect(
			getPagePublication({ url: '/cards/flash', data: { title: 'Flash', description: '' } }).description,
		).toBe(
			'Unofficial Riftbound rulings for Flash, with rules explanations, examples, and Core Rules citations.',
		)
	})
})
