import { describe, expect, test } from 'vitest'
import { createRulesDocumentFamilyCatalog } from '@/features/rules-documents/family-catalog'
import { prepareRulesChange, RulesChangeError } from '@/features/rules-documents/rules-change'

function createCatalog(
	type: 'core-rules' | 'tournament-rules',
	versions: readonly [string, string, ...string[]],
	text = (index: number) => (index === 0 ? 'Original heading' : `Changed heading ${index}`),
) {
	return createRulesDocumentFamilyCatalog({
		type,
		currentVersion: versions.at(-1)!,
		documents: Object.fromEntries(
			versions.map((version, index) => [
				version,
				{
					version,
					sections: [
						{
							heading: {
								sequence: 1,
								id: '100',
								text: text(index),
								label: '100.',
								depth: 2 as const,
							},
							blocks: [],
						},
					],
				},
			]),
		),
		adapt: (document) => document,
		diffId: (id, occurrence) => (type === 'core-rules' ? (id ?? '') : `${id ?? 'unnumbered'}::${occurrence}`),
	})
}

function createCoreRulesCatalog(
	oldRules: readonly Readonly<{ id: string; text: string }>[],
	newRules: readonly Readonly<{ id: string; text: string }>[],
) {
	return createRulesDocumentFamilyCatalog({
		type: 'core-rules',
		currentVersion: '1.1',
		documents: {
			'1.0': { version: '1.0', rules: oldRules },
			'1.1': { version: '1.1', rules: newRules },
		},
		adapt: ({ version, rules }) => ({
			version,
			sections: [
				{
					heading: { sequence: 1, id: '300', text: 'Rules', label: '300.', depth: 2 },
					blocks: [
						{
							kind: 'rules',
							rules: rules.map(({ id, text }, index) => ({
								sequence: index + 2,
								id,
								label: `${id}.`,
								diffLabel: `${id}.`,
								content: [{ kind: 'paragraph' as const, text }],
								children: [],
							})),
						},
					],
				},
			],
		}),
		diffId: (id) => id ?? '',
	})
}

function changedRuleIds(
	oldRules: readonly { id: string; text: string }[],
	newRules: readonly { id: string; text: string }[],
) {
	return prepareRulesChange(createCoreRulesCatalog(oldRules, newRules), {
		from: '1.0',
		to: '1.1',
	}).entries.map((entry) =>
		entry.kind === 'modified' ? `${entry.oldRule.id}->${entry.newRule.id}` : `${entry.kind}:${entry.rule.id}`,
	)
}

describe('Change page preparation', () => {
	test('prepares one immutable older-to-newer adjacent transition', () => {
		const change = prepareRulesChange(createCatalog('core-rules', ['1.0', '1.1']), {
			from: '1.0',
			to: '1.1',
		})

		expect(change).toMatchObject({
			from: { version: '1.0', label: 'Core Rules 1.0' },
			to: { version: '1.1', label: 'Core Rules 1.1' },
			entries: [
				{
					kind: 'modified',
					oldRule: { id: '100', label: '100.', href: '/reference/core-rules/1.0#R100' },
					newRule: { id: '100', label: '100.', href: '/reference/core-rules/1.1#R100' },
				},
			],
		})
		expect(Object.isFrozen(change)).toBe(true)
		expect(Object.isFrozen(change.entries)).toBe(true)
		expect(Object.isFrozen(change.entries[0])).toBe(true)
	})

	test.each([
		{ from: '1.0', to: '9.9', reason: 'unknown-version' },
		{ from: '1.0', to: '1.2', reason: 'non-adjacent' },
		{ from: '1.1', to: '1.0', reason: 'reversed' },
		{ from: '1.0', to: '1.0', reason: 'same-version' },
	] as const)('rejects $reason Change page versions', ({ from, to, reason }) => {
		const catalog = createCatalog('core-rules', ['1.0', '1.1', '1.2'])

		expect(() => prepareRulesChange(catalog, { from, to })).toThrow(
			expect.objectContaining<Partial<RulesChangeError>>({ reason, family: 'core-rules', from, to }),
		)
	})

	test('applies Tournament Rules labels, durable links, and difference policy', () => {
		const change = prepareRulesChange(createCatalog('tournament-rules', ['2026-03-30', '2026-04-29']), {
			from: '2026-03-30',
			to: '2026-04-29',
		})

		expect(change).toMatchObject({
			from: { version: '2026-03-30', label: 'March 2026' },
			to: { version: '2026-04-29', label: 'April 2026' },
			entries: [
				{
					kind: 'modified',
					oldRule: {
						label: '100.',
						href: '/reference/tournament-rules/2026-03-30#R100',
					},
					newRule: {
						label: '100.',
						href: '/reference/tournament-rules/2026-04-29#R100',
					},
				},
			],
		})
	})

	test('hides Tournament Rules changes that only renumber a Core Rules reference', () => {
		const change = prepareRulesChange(
			createCatalog('tournament-rules', ['2026-03-30', '2026-04-29'], (index) =>
				index === 0 ? 'Players follow CR 100.' : 'Players follow CR 101.',
			),
			{ from: '2026-03-30', to: '2026-04-29' },
		)

		expect(change.entries).toEqual([])
	})

	test.each([
		{
			name: 'inserted legality check',
			oldRules: [
				{ id: '358.2', text: 'Ensure that the outcome would not create an illegal state.' },
				{ id: '358.3', text: 'Ensure that the card has the appropriate timing permissions.' },
				{ id: '358.4', text: 'If the action is illegal, undo it and cancel the action.' },
			],
			newRules: [
				{ id: '358.2', text: 'Check that all costs were paid.' },
				{ id: '358.3', text: 'Check that the outcome would not create an illegal state.' },
				{ id: '358.4', text: 'Check that the card has the appropriate timing permissions.' },
				{ id: '358.5', text: 'If any check fails, undo it and cancel the action.' },
			],
			expected: ['added:358.2', '358.2->358.3', '358.3->358.4', '358.4->358.5'],
		},
		{
			name: 'removed conditional trigger rule',
			oldRules: [
				{ id: '383.3.e', text: 'A conditional statement must be true to place the trigger on the Chain.' },
				{ id: '383.3.f', text: 'Some Triggered Abilities trigger once each turn.' },
			],
			newRules: [
				{ id: '383.3.e', text: 'Some Triggered Abilities trigger once each turn, or N times each turn.' },
			],
			expected: ['removed:383.3.e', '383.3.f->383.3.e'],
		},
		{
			name: 'inserted permanent destination',
			oldRules: [
				{ id: '439.2.b.1', text: 'Spells will be Created to the Chain.' },
				{ id: '439.2.b.2', text: 'Runes will be Created to base.' },
			],
			newRules: [
				{ id: '439.2.b.1', text: 'Permanents will be Created at a valid Board location.' },
				{ id: '439.2.b.2', text: 'Spells will be Created on the Chain.' },
				{ id: '439.2.b.3', text: 'Runes will be Created at base.' },
			],
			expected: ['added:439.2.b.1', '439.2.b.1->439.2.b.2', '439.2.b.2->439.2.b.3'],
		},
	] as const)('prioritizes text continuations for $name', ({ oldRules, newRules, expected }) => {
		expect(changedRuleIds(oldRules, newRules)).toEqual(expected)
	})

	test('preserves the exact record when duplicate difference identities are removed', () => {
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'tournament-rules',
			currentVersion: '2026-04-29',
			documents: {
				'2026-03-30': { version: '2026-03-30', duplicate: true },
				'2026-04-29': { version: '2026-04-29', duplicate: false },
			},
			adapt: ({ version, duplicate }) => ({
				version,
				sections: [
					{
						heading: { sequence: 1, id: '100', text: 'Section', label: '100.', depth: 2 },
						blocks: [
							{
								kind: 'rules',
								rules: duplicate
									? [
											{
												sequence: 2,
												id: null,
												label: 'First',
												diffLabel: 'First',
												content: [{ kind: 'paragraph', text: 'First text' }],
												children: [],
											},
											{
												sequence: 3,
												id: null,
												label: 'Second',
												diffLabel: 'Second',
												content: [{ kind: 'paragraph', text: 'Second text' }],
												children: [],
											},
										]
									: [],
							},
						],
					},
				],
			}),
			diffId: (id, occurrence) => `${id ?? 'unnumbered'}::${occurrence}`,
		})

		const removed = prepareRulesChange(catalog, {
			from: '2026-03-30',
			to: '2026-04-29',
		}).entries.filter(({ kind }) => kind === 'removed')

		expect(removed).toMatchObject([
			{ rule: { label: 'First', href: '/reference/tournament-rules/2026-03-30#U2' } },
			{ rule: { label: 'Second', href: '/reference/tournament-rules/2026-03-30#U3' } },
		])
	})

	test('uses a named Core Rules version label when available', () => {
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.1',
			documents: { '1.0': { version: '1.0' }, '1.1': { version: '1.1' } },
			names: { '1.1': 'Spiritforged' },
			adapt: ({ version }) => ({ version, sections: [] }),
			diffId: (id) => id ?? '',
		})

		expect(prepareRulesChange(catalog, { from: '1.0', to: '1.1' }).to.label).toBe('Spiritforged')
	})

	test('permits an adjacent Change page with no visible differences', () => {
		const change = prepareRulesChange(
			createCatalog('core-rules', ['1.0', '1.1'], () => 'Same heading'),
			{
				from: '1.0',
				to: '1.1',
			},
		)

		expect(change.entries).toEqual([])
	})
})
