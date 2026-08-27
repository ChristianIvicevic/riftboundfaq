import { expect, test } from '@playwright/test'

const scenarios = [
	{ name: 'mobile sidebar', viewport: { width: 390, height: 844 }, opensSidebar: true },
	{ name: 'desktop sidebar', viewport: { width: 1440, height: 900 }, opensSidebar: false },
] as const

for (const scenario of scenarios) {
	test(`resets scroll after navigating through the ${scenario.name}`, async ({ page }) => {
		await page.setViewportSize(scenario.viewport)
		await page.goto('/')

		const previousScrollY = await page.evaluate(() => {
			window.scrollTo(0, document.documentElement.scrollHeight)
			return window.scrollY
		})

		expect(previousScrollY).toBeGreaterThan(0)

		if (scenario.opensSidebar) await page.getByRole('button', { name: 'Open Sidebar' }).click()
		await page.getByRole('link', { name: 'Abandoned Hall', exact: true }).click()

		await expect(page).toHaveURL(/\/cards\/abandoned-hall$/u)
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
	})
}
