import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { ContextualRulesChangeDocument } from '@/components/rules/contextual-change-document'
import type { ContextualRulesChange } from '@/features/rules-documents/contextual-change'

const CHANGE: ContextualRulesChange = {
	items: [
		{
			kind: 'heading',
			headingDepth: 2,
			anchor: 'new:R100',
			label: '100.',
			href: '/new#R100',
			sourceLabel: 'Core Rules 1.1',
			status: 'changed',
			content: [{ kind: 'paragraph', text: [{ type: 'same', text: 'Turn structure' }] }],
			children: [
				{
					kind: 'rule',
					anchor: 'new:R101',
					label: '101.',
					href: '/new#R101',
					sourceLabel: 'Core Rules 1.1',
					content: [{ kind: 'paragraph', text: [{ type: 'same', text: 'Parent context.' }] }],
					children: [
						{
							kind: 'rule',
							anchor: 'new:R101.1',
							label: '101.1',
							href: '/new#R101.1',
							sourceLabel: 'Core Rules 1.1',
							status: 'changed',
							content: [
								{
									kind: 'paragraph',
									text: [
										{ type: 'same', text: 'Resolve the ' },
										{
											type: 'remove',
											text: 'slow',
											href: '/old#R102',
											sourceLabel: 'Core Rules 1.0',
										},
										{
											type: 'add',
											text: 'quick',
											href: '/new#R103',
											sourceLabel: 'Core Rules 1.1',
										},
										{ type: 'same', text: ' effect.' },
									],
								},
							],
							children: [],
						},
					],
				},
				{
					kind: 'rule',
					anchor: 'new:R102',
					label: '102.',
					href: '/new#R102',
					sourceLabel: 'Core Rules 1.1',
					status: 'new',
					content: [{ kind: 'paragraph', text: [{ type: 'same', text: 'New timing rule.' }] }],
					children: [],
				},
				{
					kind: 'rule',
					anchor: 'old:R103',
					label: '103.',
					href: '/old#R103',
					sourceLabel: 'Core Rules 1.0',
					status: 'deleted',
					content: [{ kind: 'paragraph', text: [{ type: 'same', text: 'Retired timing rule.' }] }],
					children: [],
				},
				{
					kind: 'rule',
					anchor: 'new:U104',
					label: null,
					href: '/new#U104',
					sourceLabel: 'Core Rules 1.1',
					status: 'new',
					content: [{ kind: 'paragraph', text: [{ type: 'same', text: 'Unnumbered source entry.' }] }],
					children: [],
				},
			],
		},
	],
}

describe('contextual rules change document', () => {
	test('renders current labels with semantic marks and historical inline links', async () => {
		const screen = await render(<ContextualRulesChangeDocument data={CHANGE} family="core-rules" />)

		await expect.element(screen.getByText('Parent context.', { exact: true })).toBeInTheDocument()
		await expect
			.element(screen.getByRole('link', { name: '101.1 in Core Rules 1.1 (opens in a new tab)' }))
			.toHaveAttribute('href', '/new#R101.1')
		await expect
			.element(screen.getByRole('link', { name: '103. in Core Rules 1.0 (opens in a new tab)' }))
			.toHaveAttribute('href', '/old#R103')
		await expect
			.element(screen.getByRole('link', { name: 'slow in Core Rules 1.0 (opens source rules in a new tab)' }))
			.toHaveAttribute('href', '/old#R102')
		await expect
			.element(
				screen.getByRole('link', { name: 'quick in Core Rules 1.1 (opens source rules in a new tab)' }),
			)
			.toHaveAttribute('href', '/new#R103')
		await expect
			.element(
				screen.getByRole('link', {
					name: 'Open unnumbered entry in Core Rules 1.1 (opens in a new tab)',
				}),
			)
			.toHaveAttribute('href', '/new#U104')

		expect(
			screen
				.getByRole('link', { name: 'slow in Core Rules 1.0 (opens source rules in a new tab)' })
				.element()
				.closest('del'),
		).not.toBeNull()
		expect(
			screen
				.getByRole('link', { name: 'quick in Core Rules 1.1 (opens source rules in a new tab)' })
				.element()
				.closest('ins'),
		).not.toBeNull()
		expect(screen.getByText('New timing rule.', { exact: true }).element().closest('ins')).not.toBeNull()
		const removedRule = screen.getByText('Retired timing rule.', { exact: true }).element().closest('del')
		expect(removedRule).not.toBeNull()
	})
})
