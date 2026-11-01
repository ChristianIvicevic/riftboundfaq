import 'tailwindcss/index.css'
import { describe, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { CardErratum, CardErratumText } from '@/components/cards/card-erratum'

vi.mock('@/lib/cards/catalog', () => ({
	getCardReference: () => ({
		currentText: 'Current wording.',
		effectText: null,
		hasErrata: true,
		imageHeight: 1039,
		imageUrl: '/images/rune_order.svg',
		imageWidth: 744,
	}),
}))

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
		await expect.element(screen.getByText('Printed wording.')).toBeVisible()
		await expect.element(screen.getByText('Current wording.')).toBeVisible()
		await expect.element(screen.getByText('Current text', { exact: true })).toBeVisible()
		await expect.element(screen.getByText('Original text', { exact: true })).toBeVisible()
		const currentText = screen.getByText('Current wording.').element()
		const originalText = screen.getByText('Printed wording.').element()
		expect(currentText.compareDocumentPosition(originalText) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
		expect(originalText.parentElement?.classList.contains('text-fd-muted-foreground')).toBe(true)
		expect(currentText.parentElement?.classList.contains('text-fd-foreground')).toBe(true)
		expect(getComputedStyle(screen.getByText('(Printed reminder.)').element()).fontStyle).toBe('italic')
		expect(getComputedStyle(screen.getByText('Printed wording.').element()).marginTop).toBe('6px')
	})
})
