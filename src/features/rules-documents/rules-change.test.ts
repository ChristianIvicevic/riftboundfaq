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
