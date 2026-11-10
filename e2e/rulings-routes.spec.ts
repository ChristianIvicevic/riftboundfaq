import { expect, test } from '@playwright/test'

const STANDALONE_PAGES = ['/', '/about-riftbound-faq', '/the-future-of-riftbound-faq'] as const

test.describe('Rulings section routes', () => {
	for (const path of STANDALONE_PAGES) {
		test(`keeps ${path} in the Rulings section`, async ({ page }) => {
			await page.goto(path)

			expect(new URL(page.url()).pathname).toBe(path)
			await expect(
				page.getByRole('navigation', { name: 'Site sections' }).getByRole('link', {
					name: 'Rulings',
					exact: true,
				}),
			).toHaveAttribute('aria-current', 'page')
		})
	}

	test('combines standalone pages and nested rulings in one sidebar', async ({ page }) => {
		await page.goto('/rulings/cards/flash')

		const sidebar = page.getByRole('complementary').first()
		await expect(sidebar.getByText('Introduction', { exact: true })).toBeVisible()
		await expect(sidebar.getByRole('link', { name: 'About Riftbound FAQ', exact: true })).toHaveAttribute(
			'href',
			'/about-riftbound-faq',
		)
		await expect(sidebar.getByText('Browse Rulings', { exact: true })).toBeVisible()
		await expect(sidebar.getByRole('link', { name: /Card Text Updates/u })).toHaveAttribute(
			'href',
			'/rulings/card-text-updates',
		)
		await expect(
			page.getByRole('navigation', { name: 'Site sections' }).getByRole('link', {
				name: 'Rulings',
				exact: true,
			}),
		).toHaveAttribute('aria-current', 'page')
	})

	const redirects = [
		['/card-errata-list', '/rulings/card-text-updates'],
		['/cards/flash', '/rulings/cards/flash'],
		['/general-rules/targeting', '/rulings/general-rules/targeting'],
		['/mechanics/ambush', '/rulings/mechanics/ambush'],
	] as const
	for (const [from, to] of redirects) {
		test(`redirects ${from} to ${to}`, async ({ page }) => {
			await page.goto(from)

			expect(new URL(page.url()).pathname).toBe(to)
		})
	}
})
