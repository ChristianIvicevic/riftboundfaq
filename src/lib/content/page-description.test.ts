import { describe, expect, test } from 'vitest'
import { getPageDescription } from '@/lib/content/page-description'
import { SITE_DESCRIPTION } from '@/lib/site'

describe('getPageDescription', () => {
	test('prefers an authored description', () => {
		expect(
			getPageDescription({
				url: '/cards/flash',
				data: { title: 'Flash', description: 'An authored description.' },
			}),
		).toBe('An authored description.')
	})

	test.each([
		{
			case: 'card page',
			url: '/cards/akshan-mischievous',
			title: 'Akshan, Mischievous',
			expected:
				'Unofficial Riftbound rulings for Akshan, Mischievous, with rules explanations, examples, and Core Rules citations.',
		},
		{
			case: 'mechanic page',
			url: '/mechanics/ambush',
			title: 'Ambush',
			expected:
				'Unofficial answers about the Ambush mechanic in Riftbound, with examples and Core Rules citations.',
		},
		{
			case: 'general-rules page',
			url: '/general-rules/chain-and-priority',
			title: 'Chain and Priority',
			expected:
				'Unofficial Riftbound rules answers about chain and priority, with examples and Core Rules citations.',
		},
	])('builds the $case fallback', ({ url, title, expected }) => {
		expect(getPageDescription({ url, data: { title } })).toBe(expected)
	})

	test('uses the site description outside a recognized content group', () => {
		expect(getPageDescription({ url: '/', data: { title: 'About this site' } })).toBe(SITE_DESCRIPTION)
	})
})
