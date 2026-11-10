import { expect, test, type Page } from '@playwright/test'

const REACT_SCRIPT_ERROR = 'Encountered a script tag while rendering React component.'
const NOT_FOUND_COPY_VARIANTS = [
	{
		heading: "Looks like we're both lost.",
		description:
			"This page isn't here, and the trail has vanished beneath the snow. Let's head back somewhere warmer.",
		action: 'Find the way home',
		location: 'Beyond the last marked trail',
	},
	{
		heading: 'Nothing but snow from here.',
		description: "This page can't be found. The path ahead has faded, but the way home is still open.",
		action: 'Head back home',
		location: 'Somewhere past the last waypoint',
	},
	{
		heading: 'The trail ends here.',
		description:
			'The page you were looking for has disappeared beyond the ridge. Better turn back before the snow covers our tracks.',
		action: 'Return home',
		location: 'Beyond the edge of the map',
	},
	{
		heading: 'No page. Just one lonely Poro.',
		description:
			"Whatever brought you this far is gone beneath the snow. Let's not leave either of you stranded.",
		action: 'Take us home',
		location: 'Waiting where the trail went cold',
	},
	{
		heading: 'A cold place to get lost.',
		description:
			"There's no page at the end of this trail, only a Poro waiting in the snow. Let's find our way back together.",
		action: 'Back to safety',
		location: 'Far from familiar ground',
	},
] as const

function collectReactScriptErrors(page: Page) {
	const errors: string[] = []
	page.on('console', (message) => {
		if (message.type() === 'error' && message.text().includes(REACT_SCRIPT_ERROR)) {
			errors.push(message.text())
		}
	})
	return errors
}

async function getNotFoundCopy(page: Page) {
	const heading = await page.getByRole('heading', { level: 1 }).innerText()
	const copy = NOT_FOUND_COPY_VARIANTS.find((variant) => variant.heading === heading)
	if (!copy) throw new Error(`Unexpected not-found heading: ${heading}`)
	return copy
}

async function leaveNotFoundPage(page: Page, link: 'brand' | 'action') {
	await page.goto(`/this-page-does-not-exist?exit=${link}`)
	const copy = await getNotFoundCopy(page)
	await page.evaluate(() => Object.defineProperty(window, '__navigationMarker', { value: true }))
	await page
		.getByRole('link', { name: link === 'brand' ? 'Riftbound FAQ' : copy.action, exact: true })
		.click()

	await expect(page).toHaveURL('/')
	expect(await page.evaluate(() => Object.hasOwn(window, '__navigationMarker'))).toBe(false)
}

test('renders the not-found page without client-side script errors', async ({ page }) => {
	const scriptErrors = collectReactScriptErrors(page)

	const response = await page.goto('/this-page-does-not-exist')

	expect(response?.status()).toBe(404)
	const copy = await getNotFoundCopy(page)
	await expect(page.getByRole('heading', { name: copy.heading })).toBeVisible()
	await expect(page.getByText(copy.description, { exact: true })).toBeVisible()
	await expect(page.getByRole('link', { name: copy.action, exact: true })).toBeVisible()
	await expect(page.getByText(copy.location, { exact: true })).toBeVisible()
	await expect(page).toHaveTitle('Page not found | Riftbound FAQ')
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		'content',
		'The requested page could not be found on Riftbound FAQ.',
	)
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/u)
	expect(scriptErrors).toEqual([])
})

test('navigates between wiki pages without client-side script errors', async ({ page }) => {
	const scriptErrors = collectReactScriptErrors(page)

	await page.goto('/about-riftbound-faq')
	await page.evaluate(() => Object.defineProperty(window, '__navigationMarker', { value: true }))
	await page.getByRole('complementary').evaluate((element) => {
		element.dataset.navigationMarker = 'true'
	})
	scriptErrors.length = 0
	await page
		.getByRole('navigation', { name: 'Site sections' })
		.getByRole('link', { name: 'Rules Documents', exact: true })
		.click()

	await expect(page).toHaveURL('/rules-documents')
	expect(await page.evaluate(() => Object.hasOwn(window, '__navigationMarker'))).toBe(true)
	await expect(page.getByRole('complementary')).toHaveAttribute('data-navigation-marker', 'true')
	expect(scriptErrors).toEqual([])
})

test('uses document navigation for every link leaving the not-found page', async ({ page }) => {
	const scriptErrors = collectReactScriptErrors(page)

	await leaveNotFoundPage(page, 'brand')
	expect(scriptErrors).toEqual([])
	scriptErrors.length = 0
	await leaveNotFoundPage(page, 'action')
	expect(scriptErrors).toEqual([])

	await page.goBack()
	const copy = await getNotFoundCopy(page)
	await expect(page.getByRole('heading', { name: copy.heading })).toBeVisible()
	await page.goForward()
	await expect(page).toHaveURL('/')
	expect(scriptErrors).toEqual([])
})

test('initializes the persisted theme before hydration', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'dark' })
	await page.addInitScript(() => localStorage.setItem('theme', 'light'))
	await page.route('**/_next/static/chunks/**', (route) => route.abort())

	await page.goto('/about-riftbound-faq', { waitUntil: 'domcontentloaded' })

	await expect(page.locator('html')).toHaveClass(/\blight\b/u)
	await expect(page.locator('html')).toHaveCSS('color-scheme', 'light')
})
