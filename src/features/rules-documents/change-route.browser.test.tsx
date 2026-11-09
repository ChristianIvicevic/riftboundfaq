import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { renderRulesChange, resolveRulesChangeRoute } from '@/features/rules-documents/change-route'

describe('rules changes page rendering', () => {
	test('renders headings at the anchors exposed to the table of contents', async () => {
		const route = resolveRulesChangeRoute('/rules-documents/core-rules/changes/1.4')
		const screen = await render(renderRulesChange(route, { type: 'core-rules', from: '1.3', to: '1.4' }))

		await expect
			.element(screen.getByRole('heading', { level: 2, name: /^000\./u }))
			.toHaveAttribute('id', 'new:R000')
	})
})
