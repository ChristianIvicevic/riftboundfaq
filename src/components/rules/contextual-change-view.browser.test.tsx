import '@/components/rules/browser-test.css'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { ContextualRulesChangeDocument } from '@/components/rules/contextual-change-document'
import { ContextualRulesChangeView } from '@/components/rules/contextual-change-view'
import { RulesDocumentRuleList, RulesDocumentSectionHeading } from '@/components/rules/document'
import { RulesDocumentShell, RulesSectionPreamble } from '@/components/rules/document-shell'
import type { ContextualRulesChange } from '@/features/rules-documents/contextual-change'
import type { TraversedRule } from '@/features/rules-documents/family-catalog'
import type { PreparedRulesChange } from '@/features/rules-documents/rules-change'

const CHANGE: PreparedRulesChange = {
	from: { version: '1.0', label: 'Core Rules 1.0' },
	to: { version: '1.1', label: 'Core Rules 1.1' },
	entries: [],
}

const DATA: ContextualRulesChange = {
	items: [
		{
			kind: 'heading',
			headingDepth: 2,
			key: 'new:R100',
			label: '100.',
			href: '/new#R100',
			sourceLabel: 'Core Rules 1.1',
			status: 'changed',
			content: [{ kind: 'paragraph', text: [{ type: 'same', text: 'Turn structure' }] }],
			children: [
				{
					kind: 'rule',
					key: 'new:R101',
					label: '101.',
					href: '/new#R101',
					sourceLabel: 'Core Rules 1.1',
					content: [{ kind: 'paragraph', text: [{ type: 'same', text: 'Parent context.' }] }],
					children: [
						{
							kind: 'rule',
							key: 'new:R101.1',
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
					key: 'new:R102',
					label: '102.',
					href: '/new#R102',
					sourceLabel: 'Core Rules 1.1',
					status: 'new',
					content: [{ kind: 'paragraph', text: [{ type: 'same', text: 'New timing rule.' }] }],
					children: [],
				},
				{
					kind: 'rule',
					key: 'old:R103',
					label: '103.',
					href: '/old#R103',
					sourceLabel: 'Core Rules 1.0',
					status: 'deleted',
					content: [{ kind: 'paragraph', text: [{ type: 'same', text: 'Retired timing rule.' }] }],
					children: [],
				},
				{
					kind: 'rule',
					key: 'new:U104',
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

const CANONICAL_RULES: readonly TraversedRule[] = [
	{
		id: '101',
		label: '101.',
		anchor: 'R101',
		content: [{ kind: 'paragraph', text: 'Parent context.' }],
		children: [
			{
				id: '101.1',
				label: '101.1.',
				anchor: 'R101.1',
				content: [{ kind: 'paragraph', text: 'Resolve the quick effect.' }],
				children: [],
			},
		],
	},
]
const NO_REFERENCE_TARGETS = new Map<string, never>()

function clearViewQuery() {
	const url = new URL(window.location.href)
	url.searchParams.delete('view')
	window.history.replaceState(null, '', url)
}

function TestContextualRulesChangeView() {
	return (
		<>
			<div data-page-title-actions />
			<ContextualRulesChangeView
				change={CHANGE}
				context={<ContextualRulesChangeDocument data={DATA} family="core-rules" />}
			/>
		</>
	)
}

beforeEach(clearViewQuery)
afterEach(clearViewQuery)

describe('contextual rules change view', () => {
	test('renders nested context with semantic inline changes and historical links', async () => {
		const screen = await render(<TestContextualRulesChangeView />)

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

		const removedLink = screen.getByRole('link', {
			name: 'slow in Core Rules 1.0 (opens source rules in a new tab)',
		})
		const addedLink = screen.getByRole('link', {
			name: 'quick in Core Rules 1.1 (opens source rules in a new tab)',
		})
		expect(removedLink.element().closest('del')).not.toBeNull()
		expect(addedLink.element().closest('ins')).not.toBeNull()
		expect(screen.getByText('New timing rule.', { exact: true }).element().closest('ins')).not.toBeNull()
		expect(screen.getByText('Retired timing rule.', { exact: true }).element().closest('del')).not.toBeNull()
		await expect
			.element(screen.getByRole('table', { name: 'Changes from Core Rules 1.0 to Core Rules 1.1' }))
			.not.toBeInTheDocument()
	})

	test('stores the selected comparison view in the URL', async () => {
		const screen = await render(<TestContextualRulesChangeView />)
		const context = screen.getByRole('button', { name: 'Changes in context' })
		const beforeAfter = screen.getByRole('button', { name: 'Before & after' })

		await expect.element(context).toHaveAttribute('aria-pressed', 'true')
		await beforeAfter.click()
		await expect.element(beforeAfter).toHaveAttribute('aria-pressed', 'true')
		await expect
			.element(screen.getByRole('table', { name: 'Changes from Core Rules 1.0 to Core Rules 1.1' }))
			.toBeInTheDocument()
		expect(new URL(window.location.href).searchParams.get('view')).toBe('before-and-after')

		await context.click()
		await expect.element(context).toHaveAttribute('aria-pressed', 'true')
		await expect.element(screen.getByText('Parent context.', { exact: true })).toBeInTheDocument()
		expect(new URL(window.location.href).searchParams.has('view')).toBe(false)
	})

	test('shares heading, rule, content, and nesting rhythm with rules documents', async () => {
		const screen = await render(
			<div>
				<section aria-label="Canonical rules">
					<RulesDocumentShell>
						<section>
							<RulesDocumentSectionHeading anchor="R100" heading={{ id: '100', text: 'Turn structure' }} />
							<RulesSectionPreamble>
								<RulesDocumentRuleList
									findReferences={() => []}
									labelMode="id-with-period"
									referenceTarget={(id) => NO_REFERENCE_TARGETS.get(id)}
									rules={CANONICAL_RULES}
								/>
							</RulesSectionPreamble>
						</section>
					</RulesDocumentShell>
				</section>
				<section aria-label="Contextual rules">
					<TestContextualRulesChangeView />
				</section>
			</div>,
		)
		const canonical = screen.getByRole('region', { name: 'Canonical rules' }).element()
		const contextual = screen.getByRole('region', { name: 'Contextual rules' }).element()
		const canonicalHeading = canonical.querySelector('h2')!
		const contextualHeading = contextual.querySelector('h2')!
		const canonicalRow = canonical.querySelector('a[aria-label="Link to rule 101"]')!.parentElement!
		const contextualRow = contextual.querySelector('a[href="/new#R101"]')!.parentElement!
		const changedRow = contextual.querySelector('a[href="/new#R101.1"]')!.parentElement!
		const addedRow = contextual.querySelector('a[href="/new#R102"]')!.parentElement!
		const deletedRow = contextual.querySelector('a[href="/old#R103"]')!.parentElement!
		const canonicalContent = canonicalRow.querySelector(':scope > div')!
		const contextualContent = contextualRow.querySelector(':scope > div')!
		const changedContent = changedRow.querySelector(':scope > div')!
		const canonicalNestedList = canonicalRow.parentElement!.querySelector(':scope > ol')!
		const contextualNestedList = contextualRow.parentElement!.querySelector(':scope > ol')!
		expect(getComputedStyle(canonicalHeading).paddingTop).toBe('12px')
		expect(getComputedStyle(canonicalRow).paddingTop).toBe('6px')
		expect(getComputedStyle(canonicalContent).lineHeight).toBe('24px')
		expect(getComputedStyle(canonicalNestedList).marginTop).toBe('8px')

		for (const property of [
			'fontSize',
			'lineHeight',
			'paddingTop',
			'paddingBottom',
			'paddingLeft',
			'paddingRight',
			'borderBottomWidth',
		] as const) {
			expect(getComputedStyle(contextualHeading)[property]).toBe(getComputedStyle(canonicalHeading)[property])
		}
		for (const property of ['paddingTop', 'paddingBottom'] as const) {
			expect(getComputedStyle(contextualRow)[property]).toBe(getComputedStyle(canonicalRow)[property])
			expect(getComputedStyle(changedRow)[property]).toBe(getComputedStyle(canonicalRow)[property])
		}
		for (const property of ['paddingLeft', 'paddingRight'] as const) {
			expect(getComputedStyle(contextualRow)[property]).toBe(getComputedStyle(canonicalRow)[property])
			for (const highlightedRow of [changedRow, addedRow, deletedRow]) {
				expect(getComputedStyle(highlightedRow)[property]).toBe('8px')
			}
		}
		expect(getComputedStyle(contextualContent).lineHeight).toBe(getComputedStyle(canonicalContent).lineHeight)
		expect(getComputedStyle(changedContent.querySelector('p')!).marginBottom).toBe('0px')
		for (const property of ['marginTop', 'marginLeft', 'paddingLeft'] as const) {
			expect(getComputedStyle(contextualNestedList)[property]).toBe(
				getComputedStyle(canonicalNestedList)[property],
			)
		}
	})
})
