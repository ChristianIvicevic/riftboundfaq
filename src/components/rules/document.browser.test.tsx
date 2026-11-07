import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { RulesDocumentRuleList } from '@/components/rules/document'

describe('RulesDocumentRuleList', () => {
	test('renders change badges for numbered, unlabeled, and nested rules', async () => {
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

		expect(screen.container.querySelector('[id="R100.1"] > div')?.textContent).toContain('Changed')
		expect(screen.container.querySelector('[id="R100.1.a"] > div')?.textContent).toContain('Added')
		expect(screen.container.querySelector('[id="U3"] > div')?.textContent).toContain('Added')
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
