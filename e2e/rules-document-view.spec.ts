import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 720 } })

for (const archive of [
	{
		name: 'Core Rules',
		path: '/rules-documents/core-rules/1.4',
		currentName: 'current Core Rules',
		currentPath: '/rules-documents/core-rules/1.5',
	},
	{
		name: 'Tournament Rules',
		path: '/rules-documents/tournament-rules/2026-07-16',
		currentName: 'current Tournament Rules',
		currentPath: '/rules-documents/tournament-rules/2026-10-09',
	},
]) {
	test(`identifies archived ${archive.name} and links to the current document`, async ({ page }) => {
		await page.goto(archive.path)
		const article = page.locator('article')

		await expect(article.getByText('Archived reference', { exact: true })).toBeVisible()
		await expect(article.getByRole('link', { name: archive.currentName, exact: true })).toHaveAttribute(
			'href',
			archive.currentPath,
		)
		await expect(article.getByRole('heading', { level: 2 }).first()).toBeVisible()
	})
}

test('keeps nested rules reachable on a phone', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto('/rules-documents/tournament-rules/2026-10-09')
	const article = page.locator('article')
	const nestedRuleLink = article.getByRole('link', { name: 'Link to rule 202.1.a' })

	await expect(article.getByRole('heading', { level: 2, name: /^100\. Introduction/u })).toBeVisible()
	await expect(nestedRuleLink).toHaveAttribute('href', '#R202.1.a')
	await nestedRuleLink.scrollIntoViewIfNeeded()
	await expect(nestedRuleLink).toBeInViewport()
	await expect(
		article.getByText(
			'Limited: A limited competition is one where all product needed for play is provided during the competition.',
			{ exact: true },
		),
	).toBeVisible()
	expect(
		await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
	).toBe(0)
})
