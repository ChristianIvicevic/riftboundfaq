import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { RulesDocumentRuleList } from '@/components/rules/document'

describe('RulesDocumentRuleList', () => {
	test('uses the conventional link color for cards in rules examples', () => {
		const html = renderToStaticMarkup(
			<RulesDocumentRuleList
				anchors={new Map()}
				findReferences={() => []}
				labelMode="id-with-period"
				referenceTargets={new Map()}
				ruleIds={new Set()}
				rules={[
					{
						sequence: 1,
						id: '100.1',
						content: [{ kind: 'example', text: 'Example: Loose Cannon.' }],
						children: [],
					},
				]}
			/>,
		)

		expect(html).toMatch(/<a[^>]*class="[^"]*text-fd-primary[^"]*"[^>]*>Loose Cannon<\/a>/u)
	})
})
