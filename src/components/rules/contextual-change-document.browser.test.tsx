import 'tailwindcss/index.css'
import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'
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

function visibleBadges(container: Element, label: string) {
	return [...container.querySelectorAll<HTMLElement>('[data-slot="status-badge"]')].filter((element) => {
		const bounds = element.getBoundingClientRect()
		return element.textContent === label && bounds.width > 0 && bounds.height > 0
	})
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

	test('stacks mobile rule content with the status on the label line', async () => {
		await page.viewport(390, 844)
		try {
			const screen = await render(<ContextualRulesChangeDocument data={CHANGE} family="core-rules" />)
			const label = screen
				.getByRole('link', { name: '101.1 in Core Rules 1.1 (opens in a new tab)' })
				.element()
			const changedRule = label.closest('li')
			const content = changedRule?.querySelector('p')
			const mobileBadges = changedRule ? visibleBadges(changedRule, 'Changed') : []
			const unnumberedLink = screen
				.getByRole('link', { name: 'Open unnumbered entry in Core Rules 1.1 (opens in a new tab)' })
				.element()
			const unnumberedRule = unnumberedLink.closest('li')
			if (!content || !unnumberedRule) throw new Error('Expected changed and unnumbered rule content')
			expect(mobileBadges).toHaveLength(1)
			expect(visibleBadges(unnumberedRule, 'Added')).toHaveLength(1)

			const mobileLabelBox = label.getBoundingClientRect()
			const mobileContentBox = content.getBoundingClientRect()
			const mobileBadgeBox = mobileBadges[0]!.getBoundingClientRect()
			const labelCenter = mobileLabelBox.top + mobileLabelBox.height / 2
			const badgeCenter = mobileBadgeBox.top + mobileBadgeBox.height / 2
			expect(mobileContentBox.top).toBeGreaterThanOrEqual(mobileLabelBox.bottom)
			expect(Math.abs(labelCenter - badgeCenter)).toBeLessThanOrEqual(2)

			await page.viewport(1280, 720)
			const desktopLabelBox = label.getBoundingClientRect()
			const desktopContentBox = content.getBoundingClientRect()
			const desktopRow = changedRule?.firstElementChild
			const desktopRowBox = desktopRow?.getBoundingClientRect()
			const desktopBadges = changedRule ? visibleBadges(changedRule, 'Changed') : []
			if (!desktopRow || !desktopRowBox) throw new Error('Expected a desktop changed-rule row')
			expect(desktopBadges).toHaveLength(1)
			expect(visibleBadges(unnumberedRule, 'Added')).toHaveLength(1)
			const desktopBadgeBox = desktopBadges[0]!.getBoundingClientRect()
			const desktopLabelCenter = desktopLabelBox.top + desktopLabelBox.height / 2
			const desktopBadgeCenter = desktopBadgeBox.top + desktopBadgeBox.height / 2
			const desktopRightPadding = Number(getComputedStyle(desktopRow).paddingRight.replace('px', ''))
			expect(Math.abs(desktopLabelBox.top - desktopContentBox.top)).toBeLessThanOrEqual(2)
			expect(Math.abs(desktopLabelCenter - desktopBadgeCenter)).toBeLessThanOrEqual(0.5)
			expect(Math.abs(desktopRowBox.right - desktopBadgeBox.right - desktopRightPadding)).toBeLessThanOrEqual(
				0.5,
			)
		} finally {
			await page.viewport(1280, 720)
		}
	})
})
