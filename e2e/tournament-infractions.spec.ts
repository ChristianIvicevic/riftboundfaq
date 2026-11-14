import { expect, test, type Locator, type Page } from '@playwright/test'

const INFRACTIONS_ROUTE = '/rules-documents/tournament-infractions'
const SOURCE_ROUTE = '/rules-documents/tournament-rules/2026-10-09'

const CATEGORIES = [
	{
		id: '702',
		name: 'Game Play Errors',
		entries: [
			['702.2', 'Missed Trigger', 'No Penalty'],
			['702.3', 'Forgetting to Score a Point', 'No Penalty'],
			['702.4', 'Forgetting to Draw Cards', 'No Penalty'],
			['702.5', 'Looking at Extra Cards', 'Warning'],
			['702.6', 'Channeling Too Many Runes', 'Warning'],
			['702.7', 'Channeling Too Few Runes', 'No Penalty'],
			['702.8', 'Overpayment for Cost', 'No Penalty'],
			['702.9', 'Mispayment for Cost', 'Warning'],
			['702.10', 'Looking at Secret Information', 'Warning'],
			['702.11', 'Looking at Opponent Private Information', 'Warning'],
			['702.12', 'Drawing Extra Cards', 'Warning'],
			['702.13', 'Facedown Card Error', 'Warning'],
			['702.14', 'Mulligan Procedure Error', 'Warning'],
			['702.15', 'Forgetting to Ready During the Awaken Phase', 'No Penalty'],
			['702.16', 'General Error', 'Warning'],
			['702.17', 'Failure to Maintain Game State', 'Warning'],
		],
	},
	{
		id: '703',
		name: 'Tournament Errors',
		entries: [
			['703.2', 'Slow Play', 'Warning'],
			['703.3', 'Decklist Error', 'Game Loss'],
			['703.4', 'Deck Presentation Error', 'Warning'],
			['703.5', 'Communication Violation', 'Warning'],
			['703.6', 'Marked Cards', 'Warning'],
			['703.7', 'Insufficient Randomization', 'Warning'],
			['703.8', 'Late to Match', 'Conditional'],
			['703.9', 'Outside Assistance', 'Conditional'],
			['703.10', 'Improperly Determining a Winner', 'Match Loss'],
		],
	},
	{
		id: '704',
		name: 'Unsporting Conduct',
		entries: [
			['704.2', 'Unsporting Minor', 'Warning'],
			['704.3', 'Unsporting Major', 'Disqualification'],
			['704.4', 'Angle Shooting', 'Warning'],
			['704.5', 'Bribery', 'Match Loss'],
			['704.6', 'Wagering', 'Disqualification'],
			['704.7', 'Theft', 'Disqualification'],
			['704.8', 'Cheating', 'Disqualification'],
		],
	},
] as const

test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })

function infractionTrigger(article: Locator, name: string) {
	return article.getByRole('button', { name: new RegExp(`^${name}`, 'u') })
}

async function horizontalOverflow(page: Page) {
	return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

test('publishes the current Tournament Infractions index', async ({ page }) => {
	await page.goto('/rules-documents')
	const overviewLink = page.locator('article').getByRole('link', { name: /^Tournament Infractions/u })
	await expect(overviewLink).toHaveAttribute('href', INFRACTIONS_ROUTE)
	await overviewLink.click()

	await expect(page).toHaveURL(INFRACTIONS_ROUTE)
	const article = page.locator('article')
	await expect(article.getByRole('heading', { level: 1, name: 'Tournament Infractions' })).toBeVisible()
	await expect(
		article.getByText(
			'A quick reference to Riftbound Tournament Rules infractions, penalties, and remedies.',
			{ exact: true },
		),
	).toBeVisible()
	await expect(article.getByText('Unofficial quick reference.', { exact: true })).toHaveCount(0)
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/u)
	await expect(article.getByRole('heading', { level: 2 })).toHaveText(CATEGORIES.map(({ name }) => name))
	await expect(article.getByRole('navigation', { name: 'Infraction categories' })).toHaveCount(0)

	await Promise.all(
		CATEGORIES.map(async (category) => {
			const region = article.getByRole('region', { name: category.name, exact: true })
			const headings = region.getByRole('heading', { level: 3 })
			await Promise.all([
				expect(headings).toHaveCount(category.entries.length),
				expect(region.getByRole('button', { name: 'Copy Link', exact: true })).toHaveCount(
					category.entries.length,
				),
			])

			await Promise.all(
				category.entries.map(async ([id, name, penalty], index) => {
					const heading = headings.nth(index)
					const trigger = heading.getByRole('button').first()
					await Promise.all([
						expect(heading).toHaveAttribute('id', `R${id}`),
						expect(trigger).toHaveAttribute('aria-expanded', 'false'),
						expect(trigger).not.toContainText(id),
						expect(trigger).toContainText(name),
						expect(trigger.locator('[data-slot="status-badge"]')).toHaveText(penalty),
					])
				}),
			)
		}),
	)
	await expect(article.getByRole('textbox')).toHaveCount(0)
	expect(await horizontalOverflow(page)).toBe(0)
	expect(
		await article.locator('[id]').evaluateAll((elements) => {
			const ids = elements.map(({ id }) => id)
			return ids.filter((id, index) => ids.indexOf(id) !== index)
		}),
	).toEqual([])
	await page.setViewportSize({ width: 320, height: 844 })
	const longestMobileTrigger = infractionTrigger(article, 'Forgetting to Ready During the Awaken Phase')
	const longestMobileSummary = longestMobileTrigger.getByText(
		'A player forgets to ready one or more game objects during their Awaken Phase.',
		{ exact: true },
	)
	await expect(longestMobileTrigger).toBeVisible()
	await expect(longestMobileSummary).toBeVisible()
	expect(await longestMobileSummary.evaluate((summary) => summary.scrollHeight <= summary.clientHeight)).toBe(
		true,
	)
	expect(await horizontalOverflow(page)).toBe(0)
})

test('reveals complete policy details in independent accordions', async ({ page }) => {
	await page.goto(INFRACTIONS_ROUTE)
	const article = page.locator('article')
	const deckPresentation = infractionTrigger(article, 'Deck Presentation Error')
	const slowPlay = infractionTrigger(article, 'Slow Play')
	const details = deckPresentation.locator('xpath=../following-sibling::*[@role="region"]')

	await expect(details).toHaveCount(1)
	await expect(details).toBeHidden()
	await deckPresentation.focus()
	await page.keyboard.press('Enter')
	await expect(deckPresentation).toHaveAttribute('aria-expanded', 'true')
	await expect(details).toBeVisible()
	const sourceLink = details.getByRole('link', {
		name: 'View 703.4 in Tournament Rules',
		exact: true,
	})
	await expect(sourceLink).toBeInViewport()
	await expect(sourceLink).toHaveAttribute('href', `${SOURCE_ROUTE}#R703.4`)
	await expect(details).toContainText(
		'Deck Presentation Error [Warning]: A player’s deck’s contents are illegal during presentation to an opponent or during gameplay.',
	)
	await expect(details.getByText('703.4.', { exact: true })).toBeVisible()
	await expect(details.getByText('703.4.c.2.a.1.a.', { exact: true })).toBeVisible()
	await expect(details).toContainText(
		'If the error is caught before the start of the first player’s turn, restore the deck to its correct state and instruct players to proceed.',
	)
	await expect(details).toContainText(
		'Example: A player has two total copies of Traveling Merchant on their registered decklist',
	)
	await slowPlay.click()
	await expect(slowPlay).toHaveAttribute('aria-expanded', 'true')
	await expect(deckPresentation).toHaveAttribute('aria-expanded', 'true')
	await deckPresentation.click()
	await expect(deckPresentation).toHaveAttribute('aria-expanded', 'false')
	await expect(details).toBeHidden()
	await expect(slowPlay).toHaveAttribute('aria-expanded', 'true')
	await expect(page).toHaveURL(INFRACTIONS_ROUTE)
	expect(await horizontalOverflow(page)).toBe(0)
})

test('opens and positions an infraction addressed by its fragment', async ({ page }) => {
	await page.goto(`${INFRACTIONS_ROUTE}#R703.4`)
	const article = page.locator('article')
	const deckPresentation = infractionTrigger(article, 'Deck Presentation Error')
	await expect(deckPresentation).toHaveAttribute('aria-expanded', 'true')
	await expect(page.locator('[id="R703.4"]')).toBeInViewport()
	await deckPresentation.click({ trial: true })
	expect(await horizontalOverflow(page)).toBe(0)

	await page.goto('/rules-documents')
	await page.goto(`${INFRACTIONS_ROUTE}#unknown-infraction`)
	const triggers = page.locator('article h3 button[aria-expanded]')
	await expect(triggers).toHaveCount(32)
	expect(
		await triggers.evaluateAll((buttons) =>
			buttons.every((button) => button.getAttribute('aria-expanded') === 'false'),
		),
	).toBe(true)
})

test('links the index from its publication surfaces while keeping it out of discovery', async ({
	page,
	request,
}) => {
	const [sitemap, search, pageImage] = await Promise.all([
		request.get('/sitemap.xml'),
		request.get('/api/search?query=Tournament%20Infractions'),
		request.get('/og/rules-documents/tournament-infractions/image.png'),
	])
	expect(sitemap.ok()).toBe(true)
	expect(await sitemap.text()).not.toContain(INFRACTIONS_ROUTE)
	expect(search.ok()).toBe(true)
	expect(await search.text()).not.toContain(INFRACTIONS_ROUTE)
	expect(pageImage.ok()).toBe(true)
	expect(pageImage.headers()['content-type']).toContain('image/png')

	await page.setViewportSize({ width: 1440, height: 900 })
	await page.goto(INFRACTIONS_ROUTE)
	const sidebar = page.getByRole('complementary').first()
	const sidebarLink = sidebar.getByRole('link', {
		name: /^Tournament Infractions(?: New)?$/u,
	})
	await expect(sidebarLink).toHaveAttribute('href', INFRACTIONS_ROUTE)
	await expect(sidebarLink.locator('svg')).toHaveClass(/lucide-gavel/u)
	const sidebarEntries = (await sidebar.locator('p, a').allTextContents()).map((entry) => entry.trim())
	const currentDocumentsIndex = sidebarEntries.indexOf('Current Documents')
	const coreRulesGroupIndex = sidebarEntries.indexOf('Core Rules', currentDocumentsIndex + 2)
	expect(sidebarEntries.slice(currentDocumentsIndex + 1, coreRulesGroupIndex)).toEqual([
		'Core Rules',
		'Tournament Rules',
		expect.stringMatching(/^Tournament Infractions(?:New)?$/u),
	])
})
