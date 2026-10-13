import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { Card } from '@/components/cards/card'

describe('Card', () => {
	test('uses catalog metadata for a hover preview', async () => {
		const screen = await render(<Card name="Last Caress" />)

		await expect.element(screen.getByRole('button', { name: 'Preview Last Caress' })).toBeVisible()
	})

	test('links an uncatalogued card directly to the Wiki', async () => {
		const screen = await render(<Card name="Future Card" />)

		await expect
			.element(screen.getByRole('link', { name: 'Future Card' }))
			.toHaveAttribute('href', 'https://wiki.leagueoflegends.com/en-us/Riftbound:Future_Card')
	})
})
