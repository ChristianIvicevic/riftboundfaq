import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { CardErratum, CardErratumText } from '@/components/cards/card-erratum'

describe('CardErratum', () => {
	test('pairs the card image with its printed and current wording', async () => {
		const screen = await render(
			<CardErratum name="Arise!">
				<CardErratumText variant="original">
					<p>
						<em>(Printed reminder.)</em>
					</p>
					<p>Printed wording.</p>
				</CardErratumText>
				<CardErratumText variant="current">
					<p>Current wording.</p>
				</CardErratumText>
			</CardErratum>,
		)

		await expect.element(screen.getByRole('region', { name: 'Arise! erratum comparison' })).toBeVisible()
		await expect.element(screen.getByRole('img', { name: 'Arise! card' })).toHaveAttribute('loading', 'lazy')
		await expect
			.element(screen.getByRole('link', { name: 'View on Riftbound Wiki' }))
			.toHaveAttribute('href', 'https://wiki.leagueoflegends.com/en-us/Riftbound:Arise!')
		const currentHeading = screen.getByRole('heading', { level: 3, name: 'Current text' })
		const originalHeading = screen.getByRole('heading', { level: 3, name: 'Original text' })
		await expect.element(currentHeading).toBeVisible()
		await expect.element(originalHeading).toBeVisible()
		const currentText = currentHeading.element().closest('section')
		const originalText = originalHeading.element().closest('section')
		if (!currentText || !originalText) throw new Error('Expected erratum text sections')
		await expect.element(currentText).toMatchTextContent('Current wording.')
		await expect.element(originalText).toMatchTextContent('Printed wording.')
		expect(currentText.compareDocumentPosition(originalText) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
		await expect.element(screen.getByText('(Printed reminder.)')).toBeVisible()
	})
})
