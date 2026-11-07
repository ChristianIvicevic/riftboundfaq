import { describe, expect, test } from 'vitest'
import type { SourceRule, SourceRulesDocument } from '@/features/rules-documents/compile'
import {
	prepareContextualRulesChange,
	type ContextualChangeNode,
} from '@/features/rules-documents/contextual-change'
import { createRulesDocumentFamilyCatalog } from '@/features/rules-documents/family-catalog'
import { rulesDocuments } from '@/features/rules-documents/registry'
import { prepareRulesChange } from '@/features/rules-documents/rules-change'
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
		diffLabel: `${id}.`,
		content: [{ kind, text }],
		children,
	}
}

function unnumberedRule(sequence: number, text: string, children: readonly SourceRule[] = []): SourceRule {
	return {
		sequence,
		id: null,
		label: null,
		diffLabel: `Source row ${sequence}`,
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
				heading: { sequence: 1, id: '100', text: 'Turn structure', label: '100.', depth: 2 },
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
				heading: { sequence: 1, id: '100', text: 'Section', label: '100.', depth: 2 },
				blocks: [{ kind: 'rules', rules: [sourceRule] }],
			},
		],
	}
}

function flatten(nodes: readonly ContextualChangeNode[]): ContextualChangeNode[] {
	return nodes.flatMap((node) => [node, ...flatten(node.children)])
}

describe('contextual rules changes', () => {
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
			diffId: (id, occurrence) => id ?? `unnumbered:${occurrence}`,
		})
		const change = prepareRulesChange(catalog, { from: '1.0', to: '1.1' })

		const contextualChange = prepareContextualRulesChange(catalog, change)
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
			href: '/reference/core-rules/1.1#R101.1',
		})
		expect(changed.content).toHaveLength(1)
		expect(changed.content[0].kind).toBe('example')
		expect(added).toMatchObject({ status: 'new', href: '/reference/core-rules/1.1#R103' })
		expect(deleted).toMatchObject({ status: 'deleted', href: '/reference/core-rules/1.0#R102' })

		const changedText = changed.content.flatMap(({ text }) => text)
		expect(changedText.find(({ text }) => text.includes('rule '))).toEqual({
			type: 'same',
			text: 'Refer to rule ',
		})
		expect(changedText).toContainEqual({
			type: 'remove',
			text: '102',
			href: '/reference/core-rules/1.0#R102',
			sourceLabel: 'Core Rules 1.0',
		})
		expect(changedText).toContainEqual({
			type: 'add',
			text: '103',
			href: '/reference/core-rules/1.1#R103',
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
			diffId: (id, occurrence) => id ?? `unnumbered:${occurrence}`,
		})

		const nodes = flatten(
			prepareContextualRulesChange(catalog, prepareRulesChange(catalog, { from: '1.0', to: '1.1' })).items,
		)
		const changed = nodes.find(({ label }) => label === '101.1.')!

		expect(changed.content.flatMap(({ text }) => text)).toContainEqual({
			type: 'same',
			text: 'rule 102',
			href: '/reference/core-rules/1.1#R102',
			sourceLabel: 'Core Rules 1.1',
		})
	})

	test('aligns textual continuation before an unrelated block of the same kind', () => {
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
			diffId: (id, occurrence) => id ?? `unnumbered:${occurrence}`,
		})

		const nodes = flatten(
			prepareContextualRulesChange(catalog, prepareRulesChange(catalog, { from: '1.0', to: '1.1' })).items,
		)
		const changed = nodes.find(({ href }) => href === '/reference/core-rules/1.1#R101')!

		expect(changed.content[0].kind).toBe('example')
		expect(changed.content[0].text).toContainEqual({ type: 'remove', text: 'turn' })
		expect(changed.content[0].text).toContainEqual({ type: 'add', text: 'round' })
		expect(changed.content[1]).toEqual({
			kind: 'example',
			text: [{ type: 'remove', text: 'An unrelated old example.' }],
		})
	})

	test('matches a renumbered parent within its branch before placing a deleted rule', () => {
		const oldDocument: SourceRulesDocument = {
			version: '1.0',
			sections: [
				{
					heading: { sequence: 1, id: '100', text: 'Section', label: '100.', depth: 2 },
					blocks: [
						{
							kind: 'rules',
							rules: [rule(2, '200', 'Repeated parent.', [rule(3, '200.a', 'Deleted child.')])],
						},
					],
				},
				{
					heading: { sequence: 4, id: '500', text: 'Other section', label: '500.', depth: 2 },
					blocks: [{ kind: 'rules', rules: [rule(5, '600', 'Repeated parent.')] }],
				},
			],
		}
		const newDocument: SourceRulesDocument = {
			version: '1.1',
			sections: [
				{
					heading: { sequence: 1, id: '100', text: 'Section', label: '100.', depth: 2 },
					blocks: [
						{
							kind: 'rules',
							rules: [rule(2, '300', 'Repeated parent.')],
						},
					],
				},
				{
					heading: { sequence: 3, id: '500', text: 'Other section', label: '500.', depth: 2 },
					blocks: [{ kind: 'rules', rules: [rule(4, '700', 'Repeated parent.')] }],
				},
			],
		}
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.1',
			documents: { '1.0': oldDocument, '1.1': newDocument },
			adapt: (source) => source,
			diffId: (id, occurrence) => id ?? `unnumbered:${occurrence}`,
		})
		const change = prepareRulesChange(catalog, { from: '1.0', to: '1.1' })

		const nodes = flatten(prepareContextualRulesChange(catalog, change).items)
		const deleted = nodes.find(({ label }) => label === '200.a.')!
		const matchedParent = nodes.find(({ children }) => children.includes(deleted))!

		expect(deleted.status).toBe('deleted')
		expect(matchedParent).toMatchObject({
			label: '300.',
			href: '/reference/core-rules/1.1#R300',
		})
		expect(matchedParent.status).toBeUndefined()
	})

	test('uses exact matcher correspondence when an unnumbered parent moves onto a removed anchor', () => {
		const oldDocument: SourceRulesDocument = {
			version: '1.0',
			sections: [
				{
					heading: { sequence: 1, id: '100', text: 'Section', label: '100.', depth: 2 },
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
					heading: { sequence: 1, id: '100', text: 'Section', label: '100.', depth: 2 },
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
			diffId: (id, occurrence) => id ?? `unnumbered:${occurrence}`,
		})
		const change = prepareRulesChange(catalog, { from: '1.0', to: '1.1' })

		const nodes = flatten(prepareContextualRulesChange(catalog, change).items)
		const deleted = nodes.find(({ href }) => href === '/reference/core-rules/1.0#R101')!
		const matchedParent = nodes.find(({ children }) => children.includes(deleted))!

		expect(matchedParent.href).toBe('/reference/core-rules/1.1#U8')
		expect(matchedParent.label).toBeNull()
		expect(nodes.some(({ href }) => href === '/reference/core-rules/1.0#U2')).toBe(false)
	})

	test('does not match a heading to a same-text rule', () => {
		const oldDocument: SourceRulesDocument = {
			version: '1.0',
			sections: [
				{
					heading: { sequence: 1, id: '100', text: 'Shared text', label: '100.', depth: 2 },
					blocks: [{ kind: 'rules', rules: [rule(2, '101', 'Deleted child.')] }],
				},
			],
		}
		const newDocument: SourceRulesDocument = {
			version: '1.1',
			sections: [
				{
					heading: { sequence: 1, id: '200', text: 'New section', label: '200.', depth: 2 },
					blocks: [{ kind: 'rules', rules: [rule(2, '201', 'Shared text')] }],
				},
			],
		}
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.1',
			documents: { '1.0': oldDocument, '1.1': newDocument },
			adapt: (source) => source,
			diffId: (id, occurrence) => id ?? `unnumbered:${occurrence}`,
		})
		const change = prepareRulesChange(catalog, { from: '1.0', to: '1.1' })

		const nodes = flatten(prepareContextualRulesChange(catalog, change).items)
		const deletedHeading = nodes.find(({ href }) => href === '/reference/core-rules/1.0#R100')!
		const deletedChild = nodes.find(({ href }) => href === '/reference/core-rules/1.0#R101')!
		const addedRule = nodes.find(({ href }) => href === '/reference/core-rules/1.1#R201')!

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
					heading: { sequence: 1, id: '100', text: 'Stable section', label: '100.', depth: 2 },
					blocks: [],
				},
				{
					heading: { sequence: 2, id: '200', text: 'Shared text', label: '200.', depth: 2 },
					blocks: [{ kind: 'rules', rules: [rule(3, '201', 'Deleted child.')] }],
				},
			],
		}
		const newDocument: SourceRulesDocument = {
			version: '1.1',
			sections: [
				{
					heading: { sequence: 1, id: '100', text: 'Stable section', label: '100.', depth: 2 },
					blocks: [
						{
							kind: 'subsection',
							heading: { sequence: 2, id: '300', text: 'Shared text', label: '300.', depth: 3 },
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
			diffId: (id, occurrence) => id ?? `unnumbered:${occurrence}`,
		})

		const nodes = flatten(
			prepareContextualRulesChange(catalog, prepareRulesChange(catalog, { from: '1.0', to: '1.1' })).items,
		)
		const deletedHeading = nodes.find(({ href }) => href === '/reference/core-rules/1.0#R200')!
		const addedHeading = nodes.find(({ href }) => href === '/reference/core-rules/1.1#R300')!

		expect(deletedHeading).toMatchObject({ headingDepth: 2, status: 'deleted' })
		expect(addedHeading).toMatchObject({ headingDepth: 3, status: 'new' })
	})

	test.each([
		{
			name: 'Core Rules',
			type: 'core-rules' as const,
			from: '1.4',
			to: '1.5',
			deletedHref: '/reference/core-rules/1.4#R323.9.a',
			parentHref: '/reference/core-rules/1.5#R323.8',
		},
		{
			name: 'Tournament Rules',
			type: 'tournament-rules' as const,
			from: '2025-07-21',
			to: '2026-03-30',
			deletedHref: '/reference/tournament-rules/2025-07-21#R403.5.c',
			parentHref: '/reference/tournament-rules/2026-03-30#R403.4',
		},
	])('preserves the authoritative $name parent match when an old anchor is reused', (fixture) => {
		const catalog = rulesDocuments.family(fixture.type)
		const change = rulesDocuments.change(fixture)

		const nodes = flatten(prepareContextualRulesChange(catalog, change).items)
		const deleted = nodes.find(({ href }) => href === fixture.deletedHref)!
		const matchedParent = nodes.find(({ children }) => children.includes(deleted))!

		expect(deleted.status).toBe('deleted')
		expect(matchedParent.href).toBe(fixture.parentHref)
	})

	test('uses a hidden renumbering match as shared context for old and new children', () => {
		const catalog = rulesDocuments.family('core-rules')
		const change = rulesDocuments.change({ type: 'core-rules', from: '1.2', to: '1.3' })

		const nodes = flatten(prepareContextualRulesChange(catalog, change).items)
		const deleted = nodes.find(({ href }) => href === '/reference/core-rules/1.2#R466.4.b')!
		const changed = nodes.find(({ href }) => href === '/reference/core-rules/1.3#R484.4.a')!
		const sharedParent = nodes.find(({ children }) => children.includes(deleted))!

		expect(sharedParent.href).toBe('/reference/core-rules/1.3#R484.4')
		expect(sharedParent.status).toBeUndefined()
		expect(sharedParent.children).toContain(changed)
		expect(nodes.some(({ href }) => href === '/reference/core-rules/1.2#R466.4')).toBe(false)
	})
})
