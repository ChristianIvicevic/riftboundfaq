import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { RulesChangeView } from '@/components/rules/change-view'
import type { PreparedRulesChange } from '@/features/rules-documents/rules-change'

const change: PreparedRulesChange = {
	from: { version: '1.0', label: 'Core Rules 1.0' },
	to: { version: '1.1', label: 'Core Rules 1.1' },
	entries: [
		{
			kind: 'modified',
			oldRule: { id: '100', label: '100.', href: '/old#R100', lines: ['Old rule'] },
			newRule: { id: '100', label: '100.', href: '/new#R100', lines: ['New rule'] },
			oldText: [
				{ type: 'remove', text: 'Old' },
				{ type: 'same', text: ' rule' },
			],
			newText: [
				{ type: 'add', text: 'New' },
				{ type: 'same', text: ' rule' },
			],
		},
	],
}

describe('Change page rendering', () => {
	test('renders passive prepared labels, links, and differences', async () => {
		const screen = await render(<RulesChangeView change={change} />)

		expect(screen.getByText('Core Rules 1.0', { exact: true }).all()).toHaveLength(3)
		expect(screen.getByText('Core Rules 1.1', { exact: true }).all()).toHaveLength(3)
		await expect
			.element(screen.getByRole('link', { name: '100.' }).first())
			.toHaveAttribute('href', '/old#R100')
		await expect
			.element(screen.getByRole('link', { name: '100.' }).last())
			.toHaveAttribute('href', '/new#R100')
		const oldText = screen.getByText('Old', { exact: true })
		const newText = screen.getByText('New', { exact: true })
		await expect.element(oldText).toBeInTheDocument()
		await expect.element(newText).toBeInTheDocument()
		expect(oldText.element().tagName).toBe('DEL')
		expect(newText.element().tagName).toBe('INS')
	})
})
