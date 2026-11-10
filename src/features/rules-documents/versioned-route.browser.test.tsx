import 'tailwindcss/index.css'
import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'
import {
	renderVersionedRulesDocument,
	resolveVersionedRulesRoute,
} from '@/features/rules-documents/versioned-route'

function visibleBadges(container: Element, label: string) {
	return [...container.querySelectorAll<HTMLElement>('[data-slot="status-badge"]')].filter((element) => {
		const bounds = element.getBoundingClientRect()
		return element.textContent === label && bounds.width > 0 && bounds.height > 0
	})
}

describe('version-specific rules page rendering', () => {
	test('renders an archived Core Rules document', async () => {
		const route = resolveVersionedRulesRoute({
			url: '/rules-documents/core-rules/1.0',
			rulesDocument: { type: 'core-rules', version: '1.0' },
		})
		const screen = await render(renderVersionedRulesDocument(route))

		expect(screen.getByRole('article').elements()).toHaveLength(0)
		await expect
			.element(screen.getByRole('heading', { level: 2, name: /^000\./u }))
			.toHaveAttribute('id', 'R000')
	})

	test('shows one visible change badge per marker in an archived Core Rules document', async () => {
		await page.viewport(390, 844)
		try {
			const route = resolveVersionedRulesRoute({
				url: '/rules-documents/core-rules/1.1',
				rulesDocument: { type: 'core-rules', version: '1.1' },
			})
			const screen = await render(renderVersionedRulesDocument(route))
			const changedRule = screen.container.querySelector('[id="R106.4.d"]')
			const addedHeading = screen.container.querySelector('[id="R712"]')
			if (!changedRule || !addedHeading) throw new Error('Expected archived rules change markers')

			expect(visibleBadges(changedRule, 'Changed')).toHaveLength(1)
			expect(visibleBadges(addedHeading, 'Added')).toHaveLength(1)

			await page.viewport(1280, 720)
			expect(visibleBadges(changedRule, 'Changed')).toHaveLength(1)
			expect(visibleBadges(addedHeading, 'Added')).toHaveLength(1)
		} finally {
			await page.viewport(1280, 720)
		}
	})

	test('renders the current Tournament Rules through its family adapter', async () => {
		const route = resolveVersionedRulesRoute({
			url: '/rules-documents/tournament-rules/2026-10-09',
			rulesDocument: { type: 'tournament-rules', version: '2026-10-09' },
		})
		const screen = await render(renderVersionedRulesDocument(route))

		expect(screen.getByRole('article').elements()).toHaveLength(0)
		await expect
			.element(screen.getByRole('heading', { level: 2, name: /^100\./u }))
			.toHaveAttribute('id', 'R100')
	})
})
