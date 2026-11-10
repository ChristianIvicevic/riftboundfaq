import { expect, test } from '@playwright/test'

test.describe('Rulings section routes', () => {
	test('navigates standalone and nested rulings through one section sidebar', async ({ page }) => {
		await page.goto('/')
		const sidebar = page.getByRole('complementary').first()
		const rulingsSection = page
			.getByRole('navigation', { name: 'Site sections' })
			.getByRole('link', { name: 'Rulings', exact: true })
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
		await expect(rulingsSection).toHaveAttribute('aria-current', 'page')

		await sidebar.getByRole('link', { name: 'About Riftbound FAQ', exact: true }).click()
		await expect(page).toHaveURL('/about-riftbound-faq')
		await expect(rulingsSection).toHaveAttribute('aria-current', 'page')

		await sidebar.getByRole('link', { name: /The Future of Riftbound FAQ/u }).click()
		await expect(page).toHaveURL('/the-future-of-riftbound-faq')
		await expect(rulingsSection).toHaveAttribute('aria-current', 'page')

		await sidebar.getByRole('link', { name: 'Flash', exact: true }).click()
		await expect(page).toHaveURL('/rulings/cards/flash')
		await expect(rulingsSection).toHaveAttribute('aria-current', 'page')
	})

	const redirects = [
		['/card-errata-list', '/rulings/card-text-updates'],
		['/cards/flash', '/rulings/cards/flash'],
		['/general-rules/targeting', '/rulings/general-rules/targeting'],
		['/mechanics/ambush', '/rulings/mechanics/ambush'],
	] as const
	test('keeps legacy redirects permanent and their destination healthy', async ({ request }) => {
		await Promise.all(
			redirects.map(async ([from, to]) => {
				const [redirect, destination] = await Promise.all([
					request.get(from, { maxRedirects: 0 }),
					request.get(to),
				])
				expect(redirect.status(), from).toBe(308)
				expect(redirect.headers().location, from).toBe(to)
				expect(destination.ok(), to).toBe(true)
			}),
		)
	})
})
