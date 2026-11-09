import { describe, expect, test } from 'vitest'
import type { SourceRule, SourceRulesDocument } from '@/features/rules-documents/compile'
import {
	prepareContextualRulesChange,
	RulesChangeError,
	type ContextualChangeNode,
} from '@/features/rules-documents/contextual-change'
import { createRulesDocumentFamilyCatalog } from '@/features/rules-documents/family-catalog'
import { rulesDocuments } from '@/features/rules-documents/registry'
import type { RulesDocumentContent } from '@/lib/rules/document-types'

function rule(
	sequence: number,
	id: string,
	text: string,
	children: readonly SourceRule[] = [],
	kind: RulesDocumentContent['kind'] = 'paragraph',
): SourceRule {
	return {
		sequence,
		id,
		label: `${id}.`,
		content: [{ kind, text }],
		children,
	}
}

function unnumberedRule(sequence: number, text: string, children: readonly SourceRule[] = []): SourceRule {
	return {
		sequence,
		id: null,
		label: null,
		content: [{ kind: 'paragraph', text }],
		children,
	}
}

function document(
	version: string,
	childText: string,
	childKind: RulesDocumentContent['kind'],
	changedSibling: SourceRule,
): SourceRulesDocument {
	return {
		version,
		sections: [
			{
				heading: { sequence: 1, id: '100', text: 'Turn structure', depth: 2 },
				blocks: [
					{
						kind: 'rules',
						rules: [
							rule(2, '101', 'Parent context.', [rule(3, '101.1', childText, [], childKind)]),
							changedSibling,
							rule(5, '104', 'Unchanged sibling.'),
						],
					},
				],
			},
		],
	}
}

function singleRuleDocument(version: string, sourceRule: SourceRule): SourceRulesDocument {
	return {
		version,
		sections: [
			{
				heading: { sequence: 1, id: '100', text: 'Section', depth: 2 },
				blocks: [{ kind: 'rules', rules: [sourceRule] }],
			},
		],
	}
}

function rulesDocument(version: string, rules: readonly SourceRule[]): SourceRulesDocument {
	return {
		version,
		sections: [
			{
				heading: { sequence: 1, id: '100', text: 'Section', depth: 2 },
				blocks: [{ kind: 'rules', rules }],
			},
		],
	}
}

function flatten(nodes: readonly ContextualChangeNode[]): ContextualChangeNode[] {
	return nodes.flatMap((node) => [node, ...flatten(node.children)])
}

describe('contextual rules changes', () => {
	test.each([
		{ from: '1.0', to: '9.9', reason: 'unknown-version' },
		{ from: '1.0', to: '1.2', reason: 'non-adjacent' },
		{ from: '1.1', to: '1.0', reason: 'reversed' },
		{ from: '1.0', to: '1.0', reason: 'same-version' },
	] as const)('rejects $reason comparison versions', ({ from, to, reason }) => {
		expect(() => prepareContextualRulesChange(rulesDocuments.family('core-rules'), { from, to })).toThrow(
			expect.objectContaining<Partial<RulesChangeError>>({
				reason,
				family: 'core-rules',
				from,
				to,
			}),
		)
	})

	test('keeps complete ancestry, removes unrelated branches, and links each version exactly', () => {
		const documents = {
			'1.0': document(
				'1.0',
				'Refer to rule 102 for the slow path.',
				'paragraph',
				rule(4, '102', 'Removed legacy procedure.'),
			),
			'1.1': document(
				'1.1',
				'Refer to rule 103 for the quick path.',
				'example',
				rule(4, '103', 'Brand-new timing instruction.'),
			),
		}
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.1',
			documents,
			adapt: (source) => source,
		})
		const contextualChange = prepareContextualRulesChange(catalog, { from: '1.0', to: '1.1' })
		const nodes = flatten(contextualChange.items)
		const section = nodes.find(({ label }) => label === '100.')!
		const parent = nodes.find(({ label }) => label === '101.')!
		const changed = nodes.find(({ label }) => label === '101.1.')!
		const added = nodes.find(({ label }) => label === '103.')!
		const deleted = nodes.find(({ label }) => label === '102.')!

		expect(nodes.flatMap(({ status }) => (status ? [status] : [])).toSorted()).toEqual([
			'changed',
			'deleted',
			'new',
		])
		expect(contextualChange.items).toEqual([section])
		expect(section.status).toBeUndefined()
		expect(parent.status).toBeUndefined()
		expect(parent.children).toEqual([changed])
		expect(nodes.some(({ label }) => label === '104.')).toBe(false)
		expect(changed).toMatchObject({
			status: 'changed',
			href: '/rules-documents/core-rules/1.1#R101.1',
		})
		expect(changed.content.map(({ kind }) => kind)).toEqual(['paragraph', 'example'])
		expect(added).toMatchObject({ status: 'new', href: '/rules-documents/core-rules/1.1#R103' })
		expect(deleted).toMatchObject({ status: 'deleted', href: '/rules-documents/core-rules/1.0#R102' })

		const changedText = changed.content.flatMap(({ text }) => text)
		expect(changedText).toContainEqual({
			type: 'remove',
			text: 'rule 102',
			href: '/rules-documents/core-rules/1.0#R102',
			sourceLabel: 'Core Rules 1.0',
		})
		expect(changedText).toContainEqual({
			type: 'add',
			text: 'rule 103',
			href: '/rules-documents/core-rules/1.1#R103',
			sourceLabel: 'Core Rules 1.1',
		})
	})

	test('keeps an unchanged reference linked to the new source inside edited text', () => {
		const documents = {
			'1.0': document(
				'1.0',
				'Refer to rule 102 before drawing.',
				'paragraph',
				rule(4, '102', 'Shared target.'),
			),
			'1.1': document(
				'1.1',
				'Refer to rule 102 before playing.',
				'paragraph',
				rule(4, '102', 'Shared target.'),
			),
		}
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.1',
			documents,
			adapt: (source) => source,
		})

		const nodes = flatten(prepareContextualRulesChange(catalog, { from: '1.0', to: '1.1' }).items)
		const changed = nodes.find(({ label }) => label === '101.1.')!

		expect(changed.content.flatMap(({ text }) => text)).toContainEqual({
			type: 'same',
			text: 'rule 102',
			href: '/rules-documents/core-rules/1.1#R102',
			sourceLabel: 'Core Rules 1.1',
		})
	})

	test('links complete dotted references when their targets are renumbered', () => {
		const documents = {
			'1.0': document(
				'1.0',
				'See rule 421.2.a for old Invalid Destinations.',
				'paragraph',
				rule(4, '421.2.a', 'Shared target.'),
			),
			'1.1': document(
				'1.1',
				'See rule 425.2.a for new Invalid Destinations.',
				'paragraph',
				rule(4, '425.2.a', 'Shared target.'),
			),
		}
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.1',
			documents,
			adapt: (source) => source,
		})

		const nodes = flatten(prepareContextualRulesChange(catalog, { from: '1.0', to: '1.1' }).items)
		const changed = nodes.find(({ label }) => label === '101.1.')!

		expect(changed.content.flatMap(({ text }) => text)).toEqual([
			{ type: 'same', text: 'See rule ' },
			{
				type: 'remove',
				text: '421.2.a',
				href: '/rules-documents/core-rules/1.0#R421.2.a',
				sourceLabel: 'Core Rules 1.0',
			},
			{
				type: 'add',
				text: '425.2.a',
				href: '/rules-documents/core-rules/1.1#R425.2.a',
				sourceLabel: 'Core Rules 1.1',
			},
			{ type: 'same', text: ' for ' },
			{ type: 'remove', text: 'old' },
			{ type: 'add', text: 'new' },
			{ type: 'same', text: ' Invalid Destinations.' },
		])
	})

	test('keeps published reference-only changes visible and linked to each source', () => {
		const catalog = rulesDocuments.family('core-rules')
		const nodes = flatten(prepareContextualRulesChange(catalog, { from: '1.4', to: '1.5' }).items)
		const changed = nodes.find(({ href }) => href === '/rules-documents/core-rules/1.5#R142.4')!

		expect(changed.status).toBe('changed')
		expect(changed.content.flatMap(({ text }) => text)).toEqual(
			expect.arrayContaining([
				{
					type: 'remove',
					text: '428',
					href: '/rules-documents/core-rules/1.4#R428',
					sourceLabel: 'Core Rules 1.4',
				},
				{
					type: 'add',
					text: '429',
					href: '/rules-documents/core-rules/1.5#R429',
					sourceLabel: 'Core Rules 1.5',
				},
			]),
		)
	})

	test('uses the current identity for a renumbered modification', () => {
		const catalog = rulesDocuments.family('core-rules')
		const nodes = flatten(prepareContextualRulesChange(catalog, { from: '1.4', to: '1.5' }).items)
		const changed = nodes.find(({ href }) => href === '/rules-documents/core-rules/1.5#R323.4')!

		expect(changed).toMatchObject({
			status: 'changed',
			label: '323.4.',
			href: '/rules-documents/core-rules/1.5#R323.4',
		})
	})

	test('keeps cross-kind continuation separate from an unrelated block', () => {
		const oldRule: SourceRule = {
			...rule(2, '101', ''),
			content: [
				{ kind: 'paragraph', text: 'Resolve this effect at the end of the turn.' },
				{ kind: 'example', text: 'An unrelated old example.' },
			],
		}
		const newRule: SourceRule = {
			...rule(2, '101', ''),
			content: [{ kind: 'example', text: 'Resolve this effect at the end of the round.' }],
		}
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.1',
			documents: {
				'1.0': singleRuleDocument('1.0', oldRule),
				'1.1': singleRuleDocument('1.1', newRule),
			},
			adapt: (sourceDocument) => sourceDocument,
		})

		const nodes = flatten(prepareContextualRulesChange(catalog, { from: '1.0', to: '1.1' }).items)
		const changed = nodes.find(({ href }) => href === '/rules-documents/core-rules/1.1#R101')!

		expect(changed.content).toEqual([
			{
				kind: 'paragraph',
				text: [{ type: 'remove', text: 'Resolve this effect at the end of the turn.' }],
			},
			{
				kind: 'example',
				text: [{ type: 'remove', text: 'An unrelated old example.' }],
			},
			{
				kind: 'example',
				text: [{ type: 'add', text: 'Resolve this effect at the end of the round.' }],
			},
		])
	})

	test('renders a content-kind-only change as a complete removal and addition', () => {
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.1',
			documents: {
				'1.0': singleRuleDocument('1.0', rule(2, '101', 'Identical text.', [], 'paragraph')),
				'1.1': singleRuleDocument('1.1', rule(2, '101', 'Identical text.', [], 'example')),
			},
			adapt: (sourceDocument) => sourceDocument,
		})

		const changed = flatten(prepareContextualRulesChange(catalog, { from: '1.0', to: '1.1' }).items).find(
			({ label }) => label === '101.',
		)!

		expect(changed.status).toBe('changed')
		expect(changed.content).toEqual([
			{ kind: 'paragraph', text: [{ type: 'remove', text: 'Identical text.' }] },
			{ kind: 'example', text: [{ type: 'add', text: 'Identical text.' }] },
		])
	})

	test('does not align unrelated blocks through shared punctuation', () => {
		const oldRule: SourceRule = {
			...rule(2, '101', ''),
			content: [
				{ kind: 'paragraph', text: 'Stable context remains unchanged.' },
				{ kind: 'paragraph', text: 'No.' },
			],
		}
		const newRule: SourceRule = {
			...rule(2, '101', ''),
			content: [
				{ kind: 'paragraph', text: 'Stable context remains unchanged.' },
				{ kind: 'paragraph', text: 'Yes.' },
			],
		}
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.1',
			documents: {
				'1.0': singleRuleDocument('1.0', oldRule),
				'1.1': singleRuleDocument('1.1', newRule),
			},
			adapt: (sourceDocument) => sourceDocument,
		})

		const changed = flatten(prepareContextualRulesChange(catalog, { from: '1.0', to: '1.1' }).items).find(
			({ label }) => label === '101.',
		)!

		expect(changed.content.slice(1)).toEqual([
			{ kind: 'paragraph', text: [{ type: 'remove', text: 'No.' }] },
			{ kind: 'paragraph', text: [{ type: 'add', text: 'Yes.' }] },
		])
	})

	test('uses a renumbered parent as unchanged context for a deleted rule', () => {
		const oldDocument: SourceRulesDocument = {
			version: '1.0',
			sections: [
				{
					heading: { sequence: 1, id: '100', text: 'Section', depth: 2 },
					blocks: [
						{
							kind: 'rules',
							rules: [rule(2, '200', 'Repeated parent.', [rule(3, '200.a', 'Deleted child.')])],
						},
					],
				},
				{
					heading: { sequence: 4, id: '500', text: 'Other section', depth: 2 },
					blocks: [{ kind: 'rules', rules: [rule(5, '600', 'Repeated parent.')] }],
				},
			],
		}
		const newDocument: SourceRulesDocument = {
			version: '1.1',
			sections: [
				{
					heading: { sequence: 1, id: '100', text: 'Section', depth: 2 },
					blocks: [
						{
							kind: 'rules',
							rules: [rule(2, '300', 'Repeated parent.')],
						},
					],
				},
				{
					heading: { sequence: 3, id: '500', text: 'Other section', depth: 2 },
					blocks: [{ kind: 'rules', rules: [rule(4, '700', 'Repeated parent.')] }],
				},
			],
		}
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.1',
			documents: { '1.0': oldDocument, '1.1': newDocument },
			adapt: (source) => source,
		})
		const nodes = flatten(prepareContextualRulesChange(catalog, { from: '1.0', to: '1.1' }).items)
		const deleted = nodes.find(({ label }) => label === '200.a.')!
		const matchedParent = nodes.find(({ children }) => children.includes(deleted))!

		expect(deleted.status).toBe('deleted')
		expect(matchedParent).toMatchObject({
			label: '300.',
			href: '/rules-documents/core-rules/1.1#R300',
		})
		expect(matchedParent.status).toBeUndefined()
	})

	test('keeps ambiguous unnumbered parents as removals and additions', () => {
		const oldDocument: SourceRulesDocument = {
			version: '1.0',
			sections: [
				{
					heading: { sequence: 1, id: '100', text: 'Section', depth: 2 },
					blocks: [
						{
							kind: 'rules',
							rules: [
								unnumberedRule(2, 'Repeated parent.', [rule(3, '101', 'Deleted child.')]),
								unnumberedRule(4, 'Repeated parent.'),
								unnumberedRule(8, 'Removed anchor occupant.'),
							],
						},
					],
				},
			],
		}
		const newDocument: SourceRulesDocument = {
			version: '1.1',
			sections: [
				{
					heading: { sequence: 1, id: '100', text: 'Section', depth: 2 },
					blocks: [
						{
							kind: 'rules',
							rules: [unnumberedRule(8, 'Repeated parent.'), unnumberedRule(9, 'Repeated parent.')],
						},
					],
				},
			],
		}
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.1',
			documents: { '1.0': oldDocument, '1.1': newDocument },
			adapt: (source) => source,
		})
		const nodes = flatten(prepareContextualRulesChange(catalog, { from: '1.0', to: '1.1' }).items)
		const deletedChild = nodes.find(({ href }) => href === '/rules-documents/core-rules/1.0#R101')!
		const deletedParent = nodes.find(({ href }) => href === '/rules-documents/core-rules/1.0#U2')!

		expect(deletedParent.status).toBe('deleted')
		expect(deletedParent.children).toContain(deletedChild)
		expect(nodes.find(({ href }) => href === '/rules-documents/core-rules/1.1#U8')?.status).toBe('new')
		expect(nodes.find(({ href }) => href === '/rules-documents/core-rules/1.1#U9')?.status).toBe('new')
	})

	test('prefers matching identity when duplicate exact text is removed', () => {
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.1',
			documents: {
				'1.0': rulesDocument('1.0', [rule(2, '101', 'Repeated.'), rule(3, '102', 'Repeated.')]),
				'1.1': rulesDocument('1.1', [rule(2, '102', 'Repeated.')]),
			},
			adapt: (sourceDocument) => sourceDocument,
		})

		const affected = flatten(prepareContextualRulesChange(catalog, { from: '1.0', to: '1.1' }).items).filter(
			({ status }) => status !== undefined,
		)

		expect(affected).toMatchObject([
			{
				status: 'deleted',
				href: '/rules-documents/core-rules/1.0#R101',
			},
		])
	})

	test('does not match a heading to a same-text rule', () => {
		const oldDocument: SourceRulesDocument = {
			version: '1.0',
			sections: [
				{
					heading: { sequence: 1, id: '100', text: 'Shared text', depth: 2 },
					blocks: [{ kind: 'rules', rules: [rule(2, '101', 'Deleted child.')] }],
				},
			],
		}
		const newDocument: SourceRulesDocument = {
			version: '1.1',
			sections: [
				{
					heading: { sequence: 1, id: '200', text: 'New section', depth: 2 },
					blocks: [{ kind: 'rules', rules: [rule(2, '201', 'Shared text')] }],
				},
			],
		}
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.1',
			documents: { '1.0': oldDocument, '1.1': newDocument },
			adapt: (source) => source,
		})
		const nodes = flatten(prepareContextualRulesChange(catalog, { from: '1.0', to: '1.1' }).items)
		const deletedHeading = nodes.find(({ href }) => href === '/rules-documents/core-rules/1.0#R100')!
		const deletedChild = nodes.find(({ href }) => href === '/rules-documents/core-rules/1.0#R101')!
		const addedRule = nodes.find(({ href }) => href === '/rules-documents/core-rules/1.1#R201')!

		expect(deletedHeading.status).toBe('deleted')
		expect(deletedHeading.children).toContain(deletedChild)
		expect(addedRule.status).toBe('new')
		expect(addedRule.children).not.toContain(deletedChild)
	})

	test('does not match same-text headings at different depths', () => {
		const oldDocument: SourceRulesDocument = {
			version: '1.0',
			sections: [
				{
					heading: { sequence: 1, id: '100', text: 'Stable section', depth: 2 },
					blocks: [],
				},
				{
					heading: { sequence: 2, id: '200', text: 'Shared text', depth: 2 },
					blocks: [{ kind: 'rules', rules: [rule(3, '201', 'Deleted child.')] }],
				},
			],
		}
		const newDocument: SourceRulesDocument = {
			version: '1.1',
			sections: [
				{
					heading: { sequence: 1, id: '100', text: 'Stable section', depth: 2 },
					blocks: [
						{
							kind: 'subsection',
							heading: { sequence: 2, id: '300', text: 'Shared text', depth: 3 },
							rules: [rule(3, '301', 'Added child.')],
						},
					],
				},
			],
		}
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.1',
			documents: { '1.0': oldDocument, '1.1': newDocument },
			adapt: (source) => source,
		})

		const nodes = flatten(prepareContextualRulesChange(catalog, { from: '1.0', to: '1.1' }).items)
		const deletedHeading = nodes.find(({ href }) => href === '/rules-documents/core-rules/1.0#R200')!
		const addedHeading = nodes.find(({ href }) => href === '/rules-documents/core-rules/1.1#R300')!

		expect(deletedHeading).toMatchObject({ headingDepth: 2, status: 'deleted' })
		expect(addedHeading).toMatchObject({ headingDepth: 3, status: 'new' })
	})

	test.each([
		{
			name: 'Core Rules',
			type: 'core-rules' as const,
			from: '1.4',
			to: '1.5',
			deletedHref: '/rules-documents/core-rules/1.4#R323.9.a',
			parentHref: '/rules-documents/core-rules/1.5#R323.8',
		},
		{
			name: 'Tournament Rules',
			type: 'tournament-rules' as const,
			from: '2025-07-21',
			to: '2026-03-30',
			deletedHref: '/rules-documents/tournament-rules/2025-07-21#R403.5.c',
			parentHref: '/rules-documents/tournament-rules/2026-03-30#R403.4',
		},
	])('preserves the authoritative $name parent match when an old anchor is reused', (fixture) => {
		const catalog = rulesDocuments.family(fixture.type)

		const nodes = flatten(prepareContextualRulesChange(catalog, fixture).items)
		const deleted = nodes.find(({ href }) => href === fixture.deletedHref)!
		const matchedParent = nodes.find(({ children }) => children.includes(deleted))!

		expect(deleted.status).toBe('deleted')
		expect(matchedParent.href).toBe(fixture.parentHref)
	})

	test('hides unchanged reparented Tournament Rules correspondence', () => {
		const catalog = rulesDocuments.family('tournament-rules')
		const comparison = catalog.compare('2026-04-29', '2026-07-16')

		const nodes = flatten(
			prepareContextualRulesChange(catalog, { from: '2026-04-29', to: '2026-07-16' }).items,
		)
		const moved = nodes.find(({ href }) => href === '/rules-documents/tournament-rules/2026-07-16#R202.1.a')
		const newParent = nodes.find(
			({ href }) => href === '/rules-documents/tournament-rules/2026-07-16#R202.1',
		)!

		expect(comparison.matches.find(({ oldRule }) => oldRule.id === '202.1')?.newRule.id).toBe('202.1.a')
		expect(moved).toBeUndefined()
		expect(newParent.status).toBe('new')
		expect(newParent.children.map(({ href }) => href)).toEqual([
			'/rules-documents/tournament-rules/2026-07-16#R202.1.c',
		])
	})

	test('matches every published comparison entry exactly once', () => {
		for (const type of ['core-rules', 'tournament-rules'] as const) {
			const catalog = rulesDocuments.family(type)
			for (let index = 1; index < catalog.registeredVersions.length; index++) {
				const from = catalog.registeredVersions[index - 1].version
				const to = catalog.registeredVersions[index].version
				const comparison = catalog.compare(from, to)
				const documentHref = (version: string, anchor: string) =>
					`/rules-documents/${type}/${version}#${anchor}`
				const expected = comparison.entries
					.map((entry) => {
						if (entry.kind === 'added') return `new:${documentHref(to, entry.rule.anchor)}`
						if (entry.kind === 'removed') return `deleted:${documentHref(from, entry.rule.anchor)}`
						return `changed:${documentHref(to, entry.newRule.anchor)}`
					})
					.toSorted()
				const actual = flatten(prepareContextualRulesChange(catalog, { from, to }).items)
					.flatMap(({ href, status }) => (status ? [`${status}:${href}`] : []))
					.toSorted()

				expect(actual, `${type} ${from} to ${to}`).toEqual(expected)
			}
		}
	})

	test('uses hidden renumbering matches as context for content changes', () => {
		const catalog = rulesDocuments.family('core-rules')

		const nodes = flatten(prepareContextualRulesChange(catalog, { from: '1.2', to: '1.3' }).items)
		const changed = nodes.find(({ href }) => href === '/rules-documents/core-rules/1.3#R484.4.a')!
		const sharedParent = nodes.find(({ href }) => href === '/rules-documents/core-rules/1.3#R484.4')!
		const movedChild = nodes.find(({ href }) => href === '/rules-documents/core-rules/1.3#R484.5.b')

		expect(sharedParent.status).toBeUndefined()
		expect(sharedParent.children).toContain(changed)
		expect(movedChild).toBeUndefined()
	})
})
