import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { RulesDocumentRuleList } from '@/components/rules/document'

describe('RulesDocumentRuleList', () => {
	test('renders responsive change badges for numbered, unlabeled, and nested rules', () => {
		const html = renderToStaticMarkup(
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

		expect(html.match(/>New<\/span>/gu)).toHaveLength(4)
		expect(html.match(/>Changed<\/span>/gu)).toHaveLength(2)
		expect(html.match(/class="[^"]*sm:hidden[^"]*"[^>]*>New<\/span>/gu)).toHaveLength(2)
		expect(html.match(/class="[^"]*hidden[^"]*sm:inline-flex[^"]*"[^>]*>New<\/span>/gu)).toHaveLength(2)
		expect(html).toMatch(/sm:grid-cols-\[max-content_minmax\(0,1fr\)_max-content\]/u)
	})

	test('uses the conventional link color for card preview triggers in rules examples', () => {
		const html = renderToStaticMarkup(
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

		expect(html).toMatch(/<button[^>]*class="[^"]*text-fd-primary[^"]*"[^>]*>Loose Cannon<\/button>/u)
	})
})
