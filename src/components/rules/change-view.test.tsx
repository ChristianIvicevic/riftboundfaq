import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
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
	test('renders passive prepared labels, links, and differences', () => {
		const markup = renderToStaticMarkup(<RulesChangeView change={change} />)

		expect(markup).toContain('Core Rules 1.0')
		expect(markup).toContain('Core Rules 1.1')
		expect(markup).toContain('href="/old#R100"')
		expect(markup).toContain('href="/new#R100"')
		expect(markup).toContain('<del')
		expect(markup).toContain('<ins')
	})
})
