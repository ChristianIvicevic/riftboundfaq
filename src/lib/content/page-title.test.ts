import { describe, expect, test } from 'vitest'
import { getPageTitle } from '@/lib/content/page-title'
import { SITE_TITLE } from '@/lib/site'

describe('getPageTitle', () => {
	test.each([
		{
			case: 'homepage',
			url: '/',
			title: 'About this site',
			expected: SITE_TITLE,
		},
		{
			case: 'card page',
			url: '/cards/akshan-mischievous',
			title: 'Akshan, Mischievous',
			expected: 'Akshan, Mischievous Rulings',
		},
		{
			case: 'mechanic page',
			url: '/mechanics/ambush',
			title: 'Ambush',
			expected: 'Ambush Rules',
		},
		{
			case: 'general-rules page',
			url: '/general-rules/targeting',
			title: 'Targeting',
			expected: 'Targeting',
		},
		{
			case: 'reference page',
			url: '/reference/core-rules/1.4',
			title: 'Core Rules 1.4 (Vendetta)',
			expected: 'Core Rules 1.4 (Vendetta)',
		},
	])('builds the $case title', ({ url, title, expected }) => {
		expect(getPageTitle({ url, data: { title } })).toBe(expected)
	})
})
