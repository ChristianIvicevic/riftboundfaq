import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import {
	renderVersionedRulesDocument,
	resolveVersionedRulesRoute,
	VersionedRulesRouteError,
} from '@/features/rules-documents/versioned-route'

describe('Versioned rules route rendering', () => {
	test('renders an archived Core Rules document', async () => {
		const route = resolveVersionedRulesRoute({
			url: '/reference/core-rules/1.0',
			rulesDocument: { type: 'core-rules', version: '1.0' },
		})
		const screen = await render(renderVersionedRulesDocument(route))

		await expect
			.element(screen.getByRole('heading', { level: 2, name: /^000\./u }))
			.toHaveAttribute('id', 'R000')
	})

	test('renders the Current Tournament Rules through its family adapter', async () => {
		const route = resolveVersionedRulesRoute({
			url: '/reference/tournament-rules/2026-07-16',
			rulesDocument: { type: 'tournament-rules', version: '2026-07-16' },
		})
		const screen = await render(renderVersionedRulesDocument(route))

		await expect
			.element(screen.getByRole('heading', { level: 2, name: /^100\./u }))
			.toHaveAttribute('id', 'R100')
	})

	test('rejects rendering without Versioned rules route context', () => {
		const route = resolveVersionedRulesRoute({ url: '/cards/alpha-strike' })

		expect(() => renderVersionedRulesDocument(route)).toThrow(
			expect.objectContaining<Partial<VersionedRulesRouteError>>({
				reason: 'missing-route-context',
			}),
		)
	})
})
