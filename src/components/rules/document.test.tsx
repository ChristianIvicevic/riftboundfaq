import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { RulesDocumentRuleList } from '@/components/rules/document'

describe('RulesDocumentRuleList', () => {
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
