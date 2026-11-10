import 'tailwindcss/index.css'
import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'
import { RulesDocumentRuleList } from '@/components/rules/document'

function visibleBadges(container: Element, label: string) {
	return [...container.querySelectorAll<HTMLElement>('[data-slot="status-badge"]')].filter((element) => {
		const bounds = element.getBoundingClientRect()
		return element.textContent === label && bounds.width > 0 && bounds.height > 0
	})
}

describe('RulesDocumentRuleList', () => {
	test('shows one change badge per rule in its mobile and desktop position', async () => {
		await page.viewport(390, 844)
		try {
			const screen = await render(
				<RulesDocumentRuleList
					findReferences={() => []}
					labelMode="id-with-period"
					referenceTarget={() => {}}
					rules={[
						{
							id: '100.1',
							label: '100.1.',
							anchor: 'R100.1',
							changeMarker: 'changed',
							content: [{ kind: 'paragraph', text: 'Numbered rule.' }],
							children: [
								{
									id: '100.1.a',
									label: '100.1.a.',
									anchor: 'R100.1.a',
									changeMarker: 'new',
									content: [{ kind: 'paragraph', text: 'Nested rule.' }],
									children: [],
								},
							],
						},
						{
							id: null,
							label: 'Unnumbered',
							anchor: 'U3',
							changeMarker: 'new',
							content: [{ kind: 'bullet', text: 'Unnumbered rule.' }],
							children: [],
						},
					]}
				/>,
			)
			const rule = screen.container.querySelector('[id="R100.1"]')
			const nestedRule = screen.container.querySelector('[id="R100.1.a"]')
			const unnumberedRule = screen.container.querySelector('[id="U3"]')
			const label = screen.getByRole('link', { name: 'Link to rule 100.1' }).element()
			const content = screen.getByText('Numbered rule.', { exact: true }).element()
			if (!rule || !nestedRule || !unnumberedRule) throw new Error('Expected all changed rule fixtures')

			const mobileBadges = visibleBadges(rule, 'Changed')
			expect(mobileBadges).toHaveLength(1)
			expect(visibleBadges(nestedRule, 'Added')).toHaveLength(1)
			expect(visibleBadges(unnumberedRule, 'Added')).toHaveLength(1)
			expect(label.parentElement?.contains(mobileBadges[0]!)).toBe(true)
			const mobileLabelBox = label.getBoundingClientRect()
			const mobileBadgeBox = mobileBadges[0]!.getBoundingClientRect()
			expect(content.getBoundingClientRect().top).toBeGreaterThanOrEqual(mobileLabelBox.bottom)
			expect(
				Math.abs(
					mobileLabelBox.top + mobileLabelBox.height / 2 - (mobileBadgeBox.top + mobileBadgeBox.height / 2),
				),
			).toBeLessThanOrEqual(2)

			await page.viewport(1280, 720)
			const desktopBadges = visibleBadges(rule, 'Changed')
			expect(desktopBadges).toHaveLength(1)
			expect(visibleBadges(nestedRule, 'Added')).toHaveLength(1)
			expect(visibleBadges(unnumberedRule, 'Added')).toHaveLength(1)
			expect(desktopBadges[0]!.parentElement).toBe(rule.firstElementChild)
			const desktopLabelBox = label.getBoundingClientRect()
			const desktopContentBox = content.getBoundingClientRect()
			const desktopBadgeBox = desktopBadges[0]!.getBoundingClientRect()
			expect(Math.abs(desktopLabelBox.top - desktopContentBox.top)).toBeLessThanOrEqual(2)
			expect(desktopBadgeBox.left).toBeGreaterThan(desktopContentBox.left)
		} finally {
			await page.viewport(1280, 720)
		}
	})

	test('renders a source label when its malformed ID cannot be linked as a rule reference', async () => {
		const screen = await render(
			<RulesDocumentRuleList
				findReferences={() => []}
				labelMode="source"
				referenceTarget={() => {}}
				rules={[
					{
						id: null,
						label: '701.4.b2.',
						anchor: 'U667',
						content: [{ kind: 'paragraph', text: 'Malformed source label.' }],
						children: [],
					},
				]}
			/>,
		)

		const label = screen.getByRole('link', { name: 'Link to rule 701.4.b2.' })
		await expect.element(label).toHaveTextContent('701.4.b2.')
		await expect.element(label).toHaveAttribute('href', '#U667')
	})

	test('uses the inline popover treatment for card previews in rules examples', async () => {
		const screen = await render(
			<RulesDocumentRuleList
				findReferences={() => []}
				labelMode="id-with-period"
				referenceTarget={() => {}}
				rules={[
					{
						id: '100.1',
						label: '100.1.',
						anchor: 'R100.1',
						content: [{ kind: 'example', text: 'Example: Loose Cannon.' }],
						children: [],
					},
				]}
			/>,
		)

		const trigger = screen.getByRole('button', { name: 'Preview Loose Cannon' })
		await expect.element(trigger).toHaveTextContent('Loose Cannon')
	})
})
