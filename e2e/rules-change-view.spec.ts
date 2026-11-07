import { expect, test } from '@playwright/test'

test('keeps visual change indicators visible in dark mode', async ({ page }) => {
	await page.goto('/reference/core-rules/changes/1.4?view=before-and-after')
	await expect(page.getByRole('button', { name: 'Before & after' })).toHaveAttribute('aria-pressed', 'true')
	await page.locator('html').evaluate((element) => element.classList.add('dark'))

	const contrastMeasurements = await page
		.locator('table del:not(.block), table ins:not(.block)')
		.or(page.getByText('Renumbered', { exact: true }))
		.evaluateAll((elements) => {
			type Rgba = [red: number, green: number, blue: number, alpha: number]

			const canvas = document.createElement('canvas')
			canvas.width = 1
			canvas.height = 1
			const context = canvas.getContext('2d', { willReadFrequently: true })
			if (!context) throw new Error('Canvas context is unavailable')

			const parseColor = (color: string): Rgba => {
				context.clearRect(0, 0, 1, 1)
				context.fillStyle = color
				context.fillRect(0, 0, 1, 1)
				const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data
				return [red, green, blue, alpha / 255]
			}

			// oxlint-disable-next-line unicorn/consistent-function-scoping -- Playwright serializes this callback without module scope.
			const compositeColor = (foreground: Rgba, background: Rgba): Rgba => {
				const alpha = foreground[3] + background[3] * (1 - foreground[3])
				if (alpha === 0) return [0, 0, 0, 0]
				const compositeChannel = (index: 0 | 1 | 2) =>
					(foreground[index] * foreground[3] + background[index] * background[3] * (1 - foreground[3])) /
					alpha

				return [compositeChannel(0), compositeChannel(1), compositeChannel(2), alpha]
			}

			const effectiveBackground = (element: Element | null): Rgba => {
				const layers: Rgba[] = []
				for (let current = element; current; current = current.parentElement) {
					layers.push(parseColor(getComputedStyle(current).backgroundColor))
				}

				return layers
					.toReversed()
					.reduce((background, foreground) => compositeColor(foreground, background), [255, 255, 255, 1])
			}

			// oxlint-disable-next-line unicorn/consistent-function-scoping -- Playwright serializes this callback without module scope.
			const relativeLuminance = ([red, green, blue]: Rgba) => {
				const [linearRed, linearGreen, linearBlue] = [red, green, blue].map((value) => {
					const channel = value / 255
					return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
				})

				return 0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue
			}

			const contrastRatio = (first: Rgba, second: Rgba) => {
				const firstLuminance = relativeLuminance(first)
				const secondLuminance = relativeLuminance(second)
				return (
					(Math.max(firstLuminance, secondLuminance) + 0.05) /
					(Math.min(firstLuminance, secondLuminance) + 0.05)
				)
			}

			return elements.map((element) => {
				const surroundingBackground = effectiveBackground(element.parentElement)
				const highlightBackground = effectiveBackground(element)
				const textColor = parseColor(getComputedStyle(element).color)
				const kind = element.matches('del, ins') ? 'inline-diff' : 'renumbered-pill'
				return {
					tag: element.tagName,
					kind,
					highlightContrast: contrastRatio(highlightBackground, surroundingBackground),
					textContrast: contrastRatio(textColor, highlightBackground),
					borderContrast: contrastRatio(
						parseColor(getComputedStyle(element).borderTopColor),
						surroundingBackground,
					),
				}
			})
		})

	expect(contrastMeasurements.some(({ tag }) => tag === 'DEL')).toBe(true)
	expect(contrastMeasurements.some(({ tag }) => tag === 'INS')).toBe(true)
	expect(contrastMeasurements.some(({ kind }) => kind === 'renumbered-pill')).toBe(true)
	for (const measurement of contrastMeasurements) {
		if (measurement.kind !== 'inline-diff') {
			expect(measurement.borderContrast, `${measurement.kind} border contrast`).toBeGreaterThanOrEqual(3)
			expect(measurement.textContrast, `${measurement.kind} text contrast`).toBeGreaterThanOrEqual(4.5)
			continue
		}
		expect(measurement.highlightContrast, `${measurement.tag} highlight contrast`).toBeGreaterThanOrEqual(3)
		expect(measurement.textContrast, `${measurement.tag} text contrast`).toBeGreaterThanOrEqual(4.5)
	}
})

test('styles removed rules as deleted content', async ({ page }) => {
	await page.goto('/reference/core-rules/changes/1.4?view=before-and-after')

	const removedRule = page.locator('table del.block').first()
	await expect(removedRule).toBeVisible()
	await expect(removedRule).toHaveClass(/text-fd-foreground\/75/u)
	await expect(removedRule).toHaveClass(/dark:text-fd-muted-foreground/u)
	await expect(removedRule).toHaveCSS('text-decoration-line', 'line-through')
})

test('does not render outer table chrome around mobile row cards', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto('/reference/core-rules/changes/1.4?view=before-and-after')

	const table = page.getByRole('table', { name: /Changes from/u })
	const getTableChrome = () =>
		table.evaluate((element) => {
			const style = getComputedStyle(element)
			return {
				display: style.display,
				backgroundColor: style.backgroundColor,
				borderWidths: [
					style.borderTopWidth,
					style.borderRightWidth,
					style.borderBottomWidth,
					style.borderLeftWidth,
				],
				borderRadius: style.borderRadius,
				overflow: style.overflow,
			}
		})
	const mobileTableChrome = await getTableChrome()
	const firstRowBorderWidth = await table
		.locator('tbody tr')
		.first()
		.evaluate((element) => getComputedStyle(element).borderTopWidth)

	expect(mobileTableChrome).toEqual({
		display: 'block',
		backgroundColor: 'rgba(0, 0, 0, 0)',
		borderWidths: ['0px', '0px', '0px', '0px'],
		borderRadius: '0px',
		overflow: 'visible',
	})
	expect(firstRowBorderWidth).toBe('1px')
	expect(
		await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
	).toBe(0)

	await page.setViewportSize({ width: 1440, height: 900 })
	const desktopTableChrome = await getTableChrome()
	expect(desktopTableChrome.display).toBe('table')
	expect(desktopTableChrome.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
	expect(desktopTableChrome.borderWidths).toEqual(['1px', '1px', '1px', '1px'])
	expect(desktopTableChrome.borderRadius).toBe('8px')
	expect(desktopTableChrome.overflow).toBe('visible')
})

for (const comparison of [
	{ name: 'Core Rules', path: '/reference/core-rules/changes/1.4' },
	{ name: 'Tournament Rules', path: '/reference/tournament-rules/changes/2026-03-30' },
]) {
	test(`renders ${comparison.name} contextual changes without page overflow on mobile by default`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 })
		await page.goto(comparison.path)

		await expect(page.getByRole('button', { name: 'Changes in context' })).toHaveAttribute(
			'aria-pressed',
			'true',
		)
		await expect(page.getByRole('button', { name: 'Before & after' })).toHaveAttribute(
			'aria-pressed',
			'false',
		)
		await expect(page.getByRole('table', { name: /Changes from/u })).not.toBeAttached()
		await expect(page.locator('article del').first()).toBeVisible()
		await expect(page.locator('article ins').first()).toBeVisible()

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
		)
		expect(overflow).toBe(0)
	})
}

test('keeps Context as the no-JavaScript fallback for a before-and-after URL', async ({ browser }) => {
	const context = await browser.newContext({
		baseURL: 'http://localhost:3000',
		javaScriptEnabled: false,
	})
	const page = await context.newPage()
	try {
		await page.goto('/reference/core-rules/changes/1.4?view=before-and-after')

		await expect(page.getByRole('button', { name: 'Changes in context' })).not.toBeAttached()
		await expect(page.getByRole('table', { name: /Changes from/u })).not.toBeAttached()
		await expect(page.locator('article del').first()).toBeVisible()
		await expect(page.locator('article ins').first()).toBeVisible()
	} finally {
		await context.close()
	}
})
