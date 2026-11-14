import { expect, test } from '@playwright/test'

for (const comparison of [
	{
		name: 'Core Rules',
		path: '/rules-documents/core-rules/changes/1.4',
		setLogoNames: ['Unleashed logo', 'Vendetta logo'],
		changedHeadingId: null,
	},
	{
		name: 'Tournament Rules',
		path: '/rules-documents/tournament-rules/changes/2026-07-16',
		setLogoNames: [],
		changedHeadingId: 'new:R415',
	},
]) {
	test(`renders ${comparison.name} contextual changes without layout regressions`, async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 })
		await page.goto(comparison.path)

		await expect(page.locator('article del').first()).toBeVisible()
		await expect(page.locator('article ins').first()).toBeVisible()
		await expect(page.locator('article img[alt$=" logo"]')).toHaveCount(comparison.setLogoNames.length)
		await Promise.all(
			comparison.setLogoNames.map((name) => expect(page.getByRole('img', { name })).toBeVisible()),
		)
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
		).toBe(0)

		if (comparison.changedHeadingId) {
			await page.setViewportSize({ width: 1600, height: 900 })
			const padding = await page.locator(`[id="${comparison.changedHeadingId}"]`).evaluate((heading) => {
				const changedRule = heading.parentElement?.querySelector(':scope > ol > li > div')
				if (!changedRule) throw new Error('Changed heading has no changed rule for comparison')
				const headingStyle = getComputedStyle(heading)
				const ruleStyle = getComputedStyle(changedRule)
				return {
					heading: [headingStyle.paddingLeft, headingStyle.paddingRight],
					rule: [ruleStyle.paddingLeft, ruleStyle.paddingRight],
				}
			})

			expect(padding.heading).toEqual(padding.rule)
			expect(padding.heading).not.toContain('0px')
		}
	})
}

test('aligns Core Rules titles independently of set-logo aspect ratio', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 })
	const measureHeader = async (path: string) => {
		await page.goto(path)
		return page.locator('article > header').evaluate((header) => {
			const title = header.querySelector('h1')
			const panel = header.lastElementChild
			const logoSlots = [...header.querySelectorAll('img[alt$=" logo"]')].map((logo) => logo.parentElement)
			if (!title || !panel || logoSlots.length === 0 || logoSlots.some((slot) => !slot))
				throw new Error('Core Rules set-logo header is incomplete')
			return {
				logoSlotHeights: logoSlots.map((slot) => slot!.getBoundingClientRect().height),
				logoSlotTops: logoSlots.map((slot) => slot!.getBoundingClientRect().top),
				panelTop: panel.getBoundingClientRect().top,
				titleTop: title.getBoundingClientRect().top,
			}
		})
	}

	const unleashed = await measureHeader('/rules-documents/core-rules/1.3')
	const radiance = await measureHeader('/rules-documents/core-rules/1.5')
	const comparison = await measureHeader('/rules-documents/core-rules/changes/1.5')

	expect(new Set([...unleashed.logoSlotHeights, ...radiance.logoSlotHeights]).size).toBe(1)
	expect(new Set(comparison.logoSlotHeights).size).toBe(1)
	expect(new Set(comparison.logoSlotTops).size).toBe(1)
	expect(unleashed.titleTop).toBe(unleashed.panelTop)
	expect(radiance.titleTop).toBe(radiance.panelTop)
	expect(comparison.titleTop).toBe(comparison.panelTop)
})

test('uses the full rules-document table of contents', async ({ page }) => {
	await page.setViewportSize({ width: 1600, height: 900 })
	await page.goto('/rules-documents/core-rules/changes/1.4')

	await expect(page.getByRole('heading', { name: 'On this page', exact: true })).toBeVisible()
	await expect(page.getByRole('link', { name: '050. Silver Rule', exact: true })).toBeVisible()

	await page.getByRole('link', { name: '300. Playing the Game', exact: true }).click()
	await expect(page).toHaveURL(/#new:R300$/u)
	await expect(page.locator('[id="new:R300"]')).toBeInViewport()
})

test('renders contextual changes without JavaScript', async ({ browser }, testInfo) => {
	const context = await browser.newContext({
		baseURL: testInfo.project.use.baseURL,
		javaScriptEnabled: false,
	})
	const page = await context.newPage()
	try {
		await page.goto('/rules-documents/core-rules/changes/1.4')

		await expect(page.locator('article del').first()).toBeVisible()
		await expect(page.locator('article ins').first()).toBeVisible()
	} finally {
		await context.close()
	}
})
