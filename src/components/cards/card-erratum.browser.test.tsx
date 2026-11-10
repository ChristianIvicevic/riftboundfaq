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
			.element(screen.getByRole('link', { name: 'Riftbound Wiki' }))
			.toHaveAttribute('href', 'https://wiki.leagueoflegends.com/en-us/Riftbound:Arise!')
		const currentHeading = screen.getByRole('heading', { level: 3, name: 'Current text' })
		await expect.element(currentHeading).toBeVisible()
		const currentText = currentHeading.element().closest('section')
		if (!currentText) throw new Error('Expected current erratum text section')
		await expect.element(currentText).toMatchTextContent('Current wording.')

		const printedWording = screen.getByText('Printed wording.')
		const disclosure = screen.getByText('Show printed wording')
		const details = disclosure.element().closest('details')
		if (!(details instanceof HTMLDetailsElement)) throw new Error('Expected printed wording disclosure')
		const region = screen.getByRole('region', { name: 'Arise! erratum comparison' }).element()
		const image = screen.getByRole('img', { name: 'Arise! card' }).element()
		const collapsedImageOffset = image.getBoundingClientRect().top - region.getBoundingClientRect().top

		expect(details.open).toBe(false)
		await expect.element(printedWording).not.toBeVisible()
		await disclosure.click()

		expect(details.open).toBe(true)
		await expect.element(printedWording).toBeVisible()
		await expect.element(screen.getByText('(Printed reminder.)')).toBeVisible()
		expect(
			currentText.compareDocumentPosition(printedWording.element()) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy()
		expect(image.getBoundingClientRect().top - region.getBoundingClientRect().top).toBe(collapsedImageOffset)
	})
})
