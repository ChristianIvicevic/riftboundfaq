import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'
import { RulingCrossReferences } from '@/components/ruling-cross-references'

describe('RulingCrossReferences', () => {
	test('renders exact destination questions once in a compact non-heading element', async () => {
		const screen = await render(
			<RulingCrossReferences
				references={[
					{
						type: 'interaction',
						question: 'Does Brynhir Thundersong stop cards already on the chain?',
						url: '/cards/brynhir-thundersong#existing-cards',
					},
					{
						type: 'canonical',
						question: 'What does "play" mean on a card?',
						url: '/general-rules/playing-cards#play-definition',
					},
				]}
			/>,
		)

		await expect.element(screen.getByText('See also:')).toBeVisible()
		await expect
			.element(
				screen.getByRole('link', { name: 'Does Brynhir Thundersong stop cards already on the chain?' }),
			)
			.toHaveAttribute('href', '/cards/brynhir-thundersong#existing-cards')
		await expect
			.element(screen.getByRole('link', { name: 'What does "play" mean on a card?' }))
			.toHaveAttribute('href', '/general-rules/playing-cards#play-definition')
		expect(screen.getByText('See also:').all()).toHaveLength(1)
		expect(screen.container.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(0)
	})

	test('remains usable at 390px', async () => {
		await page.viewport(390, 844)
		const screen = await render(
			<div style={{ width: 358 }}>
				<RulingCrossReferences
					references={[
						{
							type: 'interaction',
							question:
								"Does Brynhir Thundersong stop an opponent's card chosen with Promising Future from being played?",
							url: '/cards/promising-future#brynhir-thundersong',
						},
					]}
				/>
			</div>,
		)

		await expect
			.element(
				screen.getByRole('link', {
					name: "Does Brynhir Thundersong stop an opponent's card chosen with Promising Future from being played?",
				}),
			)
			.toBeVisible()
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390)
	})
})
