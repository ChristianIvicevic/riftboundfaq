import { expect, test, type Page } from '@playwright/test'

const REACT_SCRIPT_ERROR = 'Encountered a script tag while rendering React component.'

function collectReactScriptErrors(page: Page) {
	const errors: string[] = []
	page.on('console', (message) => {
		if (message.type() === 'error' && message.text().includes(REACT_SCRIPT_ERROR)) {
			errors.push(message.text())
		}
	})
	return errors
}

function getNotFoundAction(page: Page) {
	return page.getByRole('main').getByRole('link').filter({ hasNotText: 'Riftbound FAQ' })
}

async function leaveNotFoundPage(page: Page, link: 'brand' | 'action') {
	await page.goto(`/this-page-does-not-exist?exit=${link}`)
	await page.evaluate(() => Object.defineProperty(window, '__navigationMarker', { value: true }))
	await (
		link === 'brand'
			? page.getByRole('link', { name: 'Riftbound FAQ', exact: true })
			: getNotFoundAction(page)
	).click()

	await expect(page).toHaveURL('/')
	expect(await page.evaluate(() => Object.hasOwn(window, '__navigationMarker'))).toBe(false)
}

test('renders generic not-found semantics without the React script-tag error', async ({ page }) => {
	const scriptErrors = collectReactScriptErrors(page)

	const response = await page.goto('/this-page-does-not-exist')

	expect(response?.status()).toBe(404)
	const main = page.getByRole('main')
	await expect(main.getByText('Error 404', { exact: true })).toBeVisible()
	await expect(main.getByRole('heading', { level: 1 })).toBeVisible()
	await expect(main.locator('h1 + p')).toBeVisible()
	await expect(getNotFoundAction(page)).toBeVisible()
	await expect(page).toHaveTitle('Page not found | Riftbound FAQ')
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		'content',
		'The requested page could not be found on Riftbound FAQ.',
	)
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/u)
	expect(scriptErrors).toEqual([])
})

test('preserves the root layout during wiki navigation without the React script-tag error', async ({
	page,
}) => {
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

test('uses document navigation for both links leaving the global not-found boundary', async ({ page }) => {
	const scriptErrors = collectReactScriptErrors(page)

	await leaveNotFoundPage(page, 'brand')
	expect(scriptErrors).toEqual([])
	scriptErrors.length = 0
	await leaveNotFoundPage(page, 'action')
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
