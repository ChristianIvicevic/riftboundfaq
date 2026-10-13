import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { PageActions } from '@/app/(wiki)/[[...slug]]/_components/page-actions'

describe('Page actions', () => {
	test('derives the Wiki link from any card name', async () => {
		const screen = await render(<PageActions cardName="Future Card" />)

		await expect
			.element(screen.getByRole('link', { name: 'Open in Riftbound Wiki' }))
			.toHaveAttribute('href', 'https://wiki.leagueoflegends.com/en-us/Riftbound:Future_Card')
		expect(screen.getByRole('link').elements()).toHaveLength(1)
	})

	test('omits card links when no card name is provided', async () => {
		const screen = await render(<PageActions />)

		expect(screen.getByRole('link').elements()).toHaveLength(0)
	})
})
