import { describe, expect, test } from 'vitest'
import { getPagePublishingDetails } from '@/lib/content/page-publishing-details'
import { SITE_DESCRIPTION, SITE_TITLE } from '@/lib/site'

describe('getPagePublishingDetails', () => {
	test('publishes the homepage', () => {
		expect(getPagePublishingDetails({ url: '/', data: { title: 'About this site' } })).toEqual({
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
		expect(getPagePublishingDetails({ url, data: { title } })).toEqual({
			metadataTitle,
			description,
			isEditorial: true,
			isIndexable: true,
			isSourceAttributionEligible: true,
		})
	})

	test.each([
		{ case: 'Rules Documents page', url: '/reference', title: 'Rules Documents' },
		{ case: 'version-specific rules page', url: '/reference/core-rules/1.4', title: 'Core Rules 1.4' },
		{
			case: 'rules changes page',
			url: '/reference/tournament-rules/changes/2026-07-16',
			title: 'Tournament Rules Changes',
		},
	])('publishes a non-indexable $case without source attribution', ({ url, title }) => {
		expect(
			getPagePublishingDetails({
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
		expect(getPagePublishingDetails({ url, data: { title: 'Near miss' } })).toEqual({
			metadataTitle: 'Near miss',
			description: SITE_DESCRIPTION,
			isEditorial: false,
			isIndexable: true,
			isSourceAttributionEligible: true,
		})
	})

	test('preserves authored description behavior', () => {
		expect(
			getPagePublishingDetails({
				url: '/cards/flash',
				data: { title: 'Flash', description: 'An authored description.' },
			}).description,
		).toBe('An authored description.')

		expect(
			getPagePublishingDetails({ url: '/cards/flash', data: { title: 'Flash', description: '' } })
				.description,
		).toBe(
			'Unofficial Riftbound rulings for Flash, with rules explanations, examples, and Core Rules citations.',
		)
	})
})
