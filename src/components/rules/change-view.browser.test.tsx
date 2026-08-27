import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { RulesChangeView } from '@/components/rules/change-view'
import type { PreparedRulesChange } from '@/features/rules-documents/rules-change'

const CHANGE: PreparedRulesChange = {
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

const ALL_KINDS_CHANGE: PreparedRulesChange = {
	...CHANGE,
	entries: [
		{
			kind: 'added',
			rule: { id: '200', label: '200.', href: '/new#R200', lines: ['Added rule'] },
		},
		{
			kind: 'removed',
			rule: { id: '300', label: '300.', href: '/old#R300', lines: ['Removed rule'] },
		},
		...CHANGE.entries,
	],
}

const RENUMBERED_CHANGE: PreparedRulesChange = {
	...CHANGE,
	entries: [
		{
			kind: 'modified',
			oldRule: { id: '100::1', label: '100.', href: '/old#R100', lines: ['Old rule'] },
			newRule: { id: '100::2', label: '100.', href: '/new#R100', lines: ['New rule'] },
			oldText: [
				{ type: 'remove', text: 'Old' },
				{ type: 'same', text: ' rule' },
			],
			newText: [
				{ type: 'add', text: 'New' },
				{ type: 'same', text: ' rule' },
			],
		},
		{
			kind: 'modified',
			oldRule: { id: '400', label: '400.', href: '/old#R400', lines: ['Earlier text'] },
			newRule: { id: '401', label: '401.', href: '/new#R401', lines: ['Later text'] },
			oldText: [{ type: 'remove', text: 'Earlier text' }],
			newText: [{ type: 'add', text: 'Later text' }],
		},
	],
}

describe('Change page rendering', () => {
	test('renders one semantic comparison table', async () => {
		const screen = await render(<RulesChangeView change={CHANGE} />)

		await expect
			.element(
				screen.getByRole('table', {
					name: 'Changes from Core Rules 1.0 to Core Rules 1.1',
				}),
			)
			.toBeInTheDocument()
		await expect.element(screen.getByRole('columnheader', { name: 'Change' })).toBeInTheDocument()
		await expect
			.element(screen.getByRole('columnheader', { name: 'Before Core Rules 1.0' }))
			.toBeInTheDocument()
		await expect
			.element(screen.getByRole('columnheader', { name: 'After Core Rules 1.1' }))
			.toBeInTheDocument()
		await expect.element(screen.getByRole('rowheader', { name: 'Changed' })).toBeInTheDocument()
	})

	test('summarizes the visible changes and disclosed omissions', async () => {
		const screen = await render(<RulesChangeView change={ALL_KINDS_CHANGE} />)

		await expect.element(screen.getByRole('list', { name: 'Change summary' })).toBeInTheDocument()
		await expect.element(screen.getByText('3 changes', { exact: true })).toBeInTheDocument()
		await expect.element(screen.getByText('1 added', { exact: true })).toBeInTheDocument()
		await expect.element(screen.getByText('1 removed', { exact: true })).toBeInTheDocument()
		await expect.element(screen.getByText('1 changed', { exact: true })).toBeInTheDocument()
		await expect
			.element(
				screen.getByText('Routine renumbering and reference-only updates are omitted.', { exact: true }),
			)
			.toBeInTheDocument()
	})

	test('identifies historical link destinations and absent sides', async () => {
		const screen = await render(<RulesChangeView change={ALL_KINDS_CHANGE} />)

		const addedRuleLink = screen.getByRole('link', {
			name: '200. in Core Rules 1.1 (opens in a new tab)',
		})
		await expect.element(addedRuleLink).toHaveAttribute('href', '/new#R200')
		await expect.element(addedRuleLink).toHaveAttribute('target', '_blank')
		await expect
			.element(screen.getByRole('link', { name: '300. in Core Rules 1.0 (opens in a new tab)' }))
			.toHaveAttribute('href', '/old#R300')
		await expect
			.element(screen.getByText('Not present in Core Rules 1.0', { exact: true }))
			.toBeInTheDocument()
		await expect
			.element(screen.getByText('Not present in Core Rules 1.1', { exact: true }))
			.toBeInTheDocument()
	})

	test('renders passive prepared labels, links, and differences', async () => {
		const screen = await render(<RulesChangeView change={CHANGE} />)

		await expect
			.element(screen.getByRole('link', { name: '100. in Core Rules 1.0 (opens in a new tab)' }))
			.toHaveAttribute('href', '/old#R100')
		await expect
			.element(screen.getByRole('link', { name: '100. in Core Rules 1.1 (opens in a new tab)' }))
			.toHaveAttribute('href', '/new#R100')
		const oldText = screen.getByText('Old', { exact: true })
		const newText = screen.getByText('New', { exact: true })
		await expect.element(oldText).toBeInTheDocument()
		await expect.element(newText).toBeInTheDocument()
		expect(oldText.element().tagName).toBe('DEL')
		expect(newText.element().tagName).toBe('INS')
	})

	test('places version-specific rule links in their comparison cells', async () => {
		const screen = await render(<RulesChangeView change={ALL_KINDS_CHANGE} />)
		const linkedCellText = [
			['200. in Core Rules 1.1 (opens in a new tab)', 'Added rule'],
			['300. in Core Rules 1.0 (opens in a new tab)', 'Removed rule'],
			['100. in Core Rules 1.0 (opens in a new tab)', 'Old rule'],
			['100. in Core Rules 1.1 (opens in a new tab)', 'New rule'],
		] as const

		for (const [linkName, cellText] of linkedCellText) {
			const link = screen.getByRole('link', { name: linkName }).element()
			const cell = link.closest('td')
			expect(cell).not.toBeNull()
			expect(cell?.textContent).toContain(cellText)
		}
	})

	test('marks only modified entries with different displayed labels as renumbered', async () => {
		const screen = await render(<RulesChangeView change={RENUMBERED_CHANGE} />)
		const unchangedNumberRow = screen
			.getByRole('link', { name: '100. in Core Rules 1.0 (opens in a new tab)' })
			.element()
			.closest('tr')
		const renumberedRow = screen
			.getByRole('link', { name: '400. in Core Rules 1.0 (opens in a new tab)' })
			.element()
			.closest('tr')

		expect(unchangedNumberRow?.querySelector('th')?.textContent).toBe('Changed')
		expect(renumberedRow?.querySelector('th')?.textContent).toBe('ChangedRenumbered')
		await expect.element(screen.getByText('Renumbered', { exact: true })).toBeInTheDocument()
	})
})
