import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { PageActions } from '@/app/(wiki)/[[...slug]]/_components/page-actions'

describe('Page actions', () => {
	test('derives card links from the card name', async () => {
		const screen = await render(<PageActions cardName="Alpha Strike" />)

		await expect
			.element(screen.getByRole('link', { name: 'Open in Riftbound Wiki' }))
			.toHaveAttribute('href', 'https://wiki.leagueoflegends.com/en-us/Riftbound:Alpha_Strike')
		await expect
			.element(screen.getByRole('link', { name: 'Open in Card Gallery' }))
			.toHaveAttribute('href', 'https://playriftbound.com/en-us/card-gallery/#card-gallery--unl-192-219')
	})

	test('omits card links when no card name is provided', async () => {
		const screen = await render(<PageActions />)

		expect(screen.getByRole('link').elements()).toHaveLength(0)
	})
})
