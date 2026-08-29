import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { RulesDocumentRuleList } from '@/components/rules/document'

describe('RulesDocumentRuleList', () => {
	test('renders responsive change badges for numbered, unlabeled, and nested rules', async () => {
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
						changeStatus: 'changed',
						content: [{ kind: 'paragraph', text: 'Numbered rule.' }],
						children: [
							{
								id: '100.1.a',
								label: '100.1.a.',
								anchor: 'R100.1.a',
								changeStatus: 'new',
								content: [{ kind: 'paragraph', text: 'Nested rule.' }],
								children: [],
							},
						],
					},
					{
						id: null,
						label: 'Unnumbered',
						anchor: 'U3',
						changeStatus: 'new',
						content: [{ kind: 'bullet', text: 'Unnumbered rule.' }],
						children: [],
					},
				]}
			/>,
		)

		const newBadges = screen.getByText('New', { exact: true }).all()
		const changedBadges = screen.getByText('Changed', { exact: true }).all()
		expect(newBadges).toHaveLength(4)
		expect(changedBadges).toHaveLength(2)
		await expect.element(newBadges[0]).toHaveClass('sm:hidden')
		await expect.element(newBadges[1]).toHaveClass('sm:inline-flex')
		await expect.element(newBadges[2]).toHaveClass('sm:hidden')
		await expect.element(newBadges[3]).toHaveClass('sm:inline-flex')
		expect(
			[...screen.container.querySelectorAll('div')].some((element) =>
				element.classList.contains('sm:grid-cols-[max-content_minmax(0,1fr)_max-content]'),
			),
		).toBe(true)
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
		await expect.element(trigger).toHaveClass('text-inherit')
		await expect.element(trigger).toHaveClass('decoration-2')
		await expect.element(trigger).toHaveClass('decoration-dotted')
		await expect.element(trigger).toHaveClass('decoration-fd-primary/70')
		await expect.element(trigger).toHaveClass('font-medium')
		await expect.element(trigger).not.toHaveClass('text-fd-primary')
	})
})
