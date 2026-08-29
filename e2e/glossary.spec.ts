import { expect, test } from '@playwright/test'
import { z } from 'zod'

const searchResult = z.object({
	type: z.string(),
	content: z.string(),
	url: z.string(),
})

test('renders Glossary entries in MDX and copies only the visible prose', async ({ context, page }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write'])
	await page.goto('/general-rules/chain-and-priority#unit-play-reactions')

	const trigger = page.getByRole('button', { name: 'Finalizing', exact: true })
	await trigger.click()
	await expect(page.getByRole('dialog', { name: 'Finalization' })).toContainText(
		'Finalization is the setup stage of playing a card or ability',
	)

	const paragraph = page.locator('article p').filter({ hasText: "You cannot react to another player's unit" })
	await paragraph.evaluate((element) => {
		const selection = window.getSelection()
		const range = document.createRange()
		range.selectNodeContents(element)
		selection?.removeAllRanges()
		selection?.addRange(range)
	})
	await page.keyboard.press('ControlOrMeta+C')

	const copiedText = await page.evaluate(() => navigator.clipboard.readText())
	expect(copiedText).toMatch(
		/You cannot react to another player's unit before it enters the board\.\s+Finalizing the unit does not pass priority; the unit instead resolves immediately and enters the board\./u,
	)
	expect(copiedText).not.toContain('Finalization is the setup stage')
})

test.describe('touch interaction', () => {
	test.use({ hasTouch: true, viewport: { width: 320, height: 844 } })

	test('opens a Glossary entry by touch', async ({ page }) => {
		await page.goto('/general-rules/showdowns#showdown-close')

		await page.getByRole('button', { name: 'focus', exact: true }).tap()

		const dialog = page.getByRole('dialog', { name: 'Focus' })
		await expect(dialog).toBeVisible()
		const bounds = await dialog.boundingBox()
		if (!bounds) throw new Error('Glossary dialog bounds are unavailable')
		expect(bounds.x).toBeGreaterThanOrEqual(0)
		expect(bounds.x + bounds.width).toBeLessThanOrEqual(320)
	})
})

test('keeps popup explanations out of search results', async ({ request }) => {
	const response = await request.get('/api/search?query=Finalizing')
	expect(response.ok()).toBe(true)
	const parsedResults = z.array(searchResult).safeParse(await response.json())
	if (!parsedResults.success) throw parsedResults.error
	const results = parsedResults.data
	const result = results.find(
		(item) =>
			item.type === 'text' &&
			item.url === '/general-rules/chain-and-priority#unit-play-reactions' &&
			item.content.includes('<mark>Finalizing</mark>'),
	)

	expect(result?.content).toContain('<mark>Finalizing</mark> the unit does not pass priority')
	expect(result?.content).not.toContain('Finalization is the setup stage')
})
