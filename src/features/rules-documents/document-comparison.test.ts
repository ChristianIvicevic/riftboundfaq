import { describe, expect, test } from 'vitest'
import type { SourceRule, SourceRulesDocument } from '@/features/rules-documents/compile'
import { createRulesDocumentFamilyCatalog } from '@/features/rules-documents/family-catalog'
import { rulesDocuments } from '@/features/rules-documents/registry'

function sourceRule(
	sequence: number,
	id: string | null,
	text: string,
	children: readonly SourceRule[] = [],
): SourceRule {
	return {
		sequence,
		id,
		label: id === null ? null : `${id}.`,
		content: [{ kind: 'paragraph', text }],
		children,
	}
}

function rulesDocument(version: string, rules: readonly SourceRule[]): SourceRulesDocument {
	return {
		version,
		sections: [
			{
				heading: { sequence: 1, id: '300', text: 'Rules', depth: 2 },
				blocks: [{ kind: 'rules', rules }],
			},
		],
	}
}

function createCatalog(
	oldRules: readonly SourceRule[],
	newRules: readonly SourceRule[],
	type: 'core-rules' | 'tournament-rules' = 'core-rules',
) {
	const versions = type === 'core-rules' ? (['1.0', '1.1'] as const) : (['2026-03-30', '2026-04-29'] as const)
	return createRulesDocumentFamilyCatalog({
		type,
		currentVersion: versions[1],
		documents: {
			[versions[0]]: rulesDocument(versions[0], oldRules),
			[versions[1]]: rulesDocument(versions[1], newRules),
		},
		adapt: (document) => document,
	})
}

function changedRuleIds(
	oldRules: readonly Readonly<{ id: string; text: string }>[],
	newRules: readonly Readonly<{ id: string; text: string }>[],
) {
	const catalog = createCatalog(
		oldRules.map(({ id, text }, index) => sourceRule(index + 2, id, text)),
		newRules.map(({ id, text }, index) => sourceRule(index + 2, id, text)),
	)
	return catalog
		.compare('1.0', '1.1')
		.entries.map((entry) =>
			entry.kind === 'modified'
				? `${entry.oldRule.id}->${entry.newRule.id}`
				: `${entry.kind}:${entry.rule.id}`,
		)
}

describe('rules document comparison', () => {
	test('attributes the moved layers subtree to its continuing rule', () => {
		const comparison = rulesDocuments.family('core-rules').compare('1.0', '1.1')
		const match = comparison.matches.find(({ oldRule }) => oldRule.id === '637')

		expect(match?.newRule.id).toBe('450')
		expect(comparison.matches.find(({ oldRule }) => oldRule.id === '637.1.a')?.newRule.id).toBe('450.1.a')
		expect(comparison.entries).toContainEqual(
			expect.objectContaining({ kind: 'added', rule: expect.objectContaining({ id: '449' }) }),
		)
	})

	test('preserves the moved Splitting subtree and its edited child', () => {
		const comparison = rulesDocuments.family('core-rules').compare('1.0', '1.1')
		const expectedMatches = [
			['559.3.d', '352.14'],
			['559.3.d.1', '352.14.a'],
			['559.3.d.2', '352.14.b'],
			['559.3.d.3', '352.14.c'],
			['559.3.d.4', '352.14.d'],
			['559.3.d.5', '352.14.e'],
			['559.3.d.6', '352.14.f'],
			['559.3.d.7', '352.14.g'],
			['559.3.d.8', '352.14.h'],
			['559.3.d.9', '352.14.i'],
		]

		for (const [oldId, newId] of expectedMatches) {
			expect(comparison.matches.find(({ oldRule }) => oldRule.id === oldId)?.newRule.id).toBe(newId)
		}
		expect(
			comparison.entries.flatMap((entry) =>
				entry.kind === 'modified' && entry.oldRule.id?.startsWith('559.3.d')
					? [`${entry.oldRule.id}->${entry.newRule.id}`]
					: [],
			),
		).toEqual(['559.3.d.2->352.14.b'])
	})

	test('hides the unchanged Core Rules 415 to 416 renumbered subtree', () => {
		const comparison = rulesDocuments.family('core-rules').compare('1.4', '1.5')
		const expectedMatches = [
			['415', '416'],
			['415.1', '416.1'],
			['415.1.a', '416.1.a'],
			['415.1.b', '416.1.b'],
			['415.1.c', '416.1.c'],
			['415.2', '416.2'],
			['415.3', '416.3'],
			['415.3.a', '416.3.a'],
			['415.3.b', '416.3.b'],
		]

		for (const [oldId, newId] of expectedMatches) {
			expect(comparison.matches.find(({ oldRule }) => oldRule.id === oldId)?.newRule.id).toBe(newId)
		}
		expect(
			comparison.entries.filter(
				(entry) => entry.kind === 'modified' && expectedMatches.some(([oldId]) => entry.oldRule.id === oldId),
			),
		).toEqual([])
	})

	test('keeps the continuing Tournament Rules remedies separate from the inserted section', () => {
		const comparison = rulesDocuments.family('tournament-rules').compare('2026-07-16', '2026-10-09')
		const expectedMatches = [
			['703.4.b', '703.4.c'],
			['703.4.b.1', '703.4.c.1'],
			['703.4.b.2', '703.4.c.2'],
			['703.4.b.2.a', '703.4.c.2.a'],
			['703.4.b.2.a.1', '703.4.c.2.a.1'],
			['703.4.b.2.a.1.a', '703.4.c.2.a.1.a'],
			['703.4.b.2.a.2', '703.4.c.2.a.2'],
		]

		for (const [oldId, newId] of expectedMatches) {
			expect(comparison.matches.find(({ oldRule }) => oldRule.id === oldId)?.newRule.id).toBe(newId)
		}
		expect(comparison.entries).toContainEqual(
			expect.objectContaining({ kind: 'added', rule: expect.objectContaining({ id: '703.4.b' }) }),
		)
	})

	test.each([
		{ type: 'core-rules', from: '1.0', to: '1.1', oldId: '181.4', newId: '181.4' },
		{ type: 'core-rules', from: '1.0', to: '1.1', oldId: '642', newId: '456' },
		{ type: 'core-rules', from: '1.1', to: '1.2', oldId: '454', newId: '458' },
		{ type: 'core-rules', from: '1.2', to: '1.3', oldId: '106', newId: '107' },
		{ type: 'core-rules', from: '1.2', to: '1.3', oldId: '107.2', newId: '108.3' },
		{ type: 'core-rules', from: '1.2', to: '1.3', oldId: '107.5', newId: '108.6' },
		{ type: 'core-rules', from: '1.2', to: '1.3', oldId: '317', newId: '317' },
		{ type: 'core-rules', from: '1.2', to: '1.3', oldId: '353.1', newId: '356.1.b' },
		{ type: 'core-rules', from: '1.2', to: '1.3', oldId: '442.1', newId: '459.2' },
		{ type: 'core-rules', from: '1.2', to: '1.3', oldId: '466.4.b', newId: '484.5.b' },
		{ type: 'core-rules', from: '1.3', to: '1.4', oldId: '357.2', newId: '357.2' },
		{ type: 'core-rules', from: '1.3', to: '1.4', oldId: '383.3.b', newId: '383.3.b' },
		{ type: 'core-rules', from: '1.3', to: '1.4', oldId: '390', newId: '390' },
		{ type: 'core-rules', from: '1.3', to: '1.4', oldId: '740', newId: '740.1' },
		{ type: 'core-rules', from: '1.3', to: '1.4', oldId: '741', newId: '740.2' },
		{ type: 'core-rules', from: '1.4', to: '1.5', oldId: '412', newId: '413' },
		{ type: 'core-rules', from: '1.4', to: '1.5', oldId: '477.3', newId: '479.4' },
		{ type: 'core-rules', from: '1.4', to: '1.5', oldId: '477.3.e.1', newId: '479.4.e.1' },
		{ type: 'core-rules', from: '1.4', to: '1.5', oldId: '805.1', newId: '805.1' },
		{
			type: 'tournament-rules',
			from: '2025-07-21',
			to: '2026-03-30',
			oldId: '509',
			newId: '509',
		},
		{
			type: 'tournament-rules',
			from: '2025-07-21',
			to: '2026-03-30',
			oldId: '602.4',
			newId: '602.1',
		},
		{
			type: 'tournament-rules',
			from: '2025-07-21',
			to: '2026-03-30',
			oldId: '702.15',
			newId: '702.16',
		},
		{
			type: 'tournament-rules',
			from: '2026-03-30',
			to: '2026-04-29',
			oldId: '406.1.d',
			newId: '406.1.e',
		},
		{
			type: 'tournament-rules',
			from: '2026-04-29',
			to: '2026-07-16',
			oldId: '506.3.d',
			newId: '506.3.e',
		},
		{
			type: 'tournament-rules',
			from: '2026-07-16',
			to: '2026-10-09',
			oldId: '406.1.e',
			newId: '406.1.f',
		},
		{
			type: 'tournament-rules',
			from: '2026-07-16',
			to: '2026-10-09',
			oldId: '702.8.b.1',
			newId: '702.8.b.1',
		},
		{
			type: 'tournament-rules',
			from: '2026-07-16',
			to: '2026-10-09',
			oldId: '702.13.b',
			newId: '702.13.c',
		},
	] as const)(
		'preserves audited $type correspondence $oldId to $newId',
		({ type, from, to, oldId, newId }) => {
			const comparison = rulesDocuments.family(type).compare(from, to)

			expect(comparison.matches.find(({ oldRule }) => oldRule.id === oldId)?.newRule.id).toBe(newId)
		},
	)

	test('leaves the duplicated cleanup instruction unmatched across consolidated phases', () => {
		const comparison = rulesDocuments.family('core-rules').compare('1.2', '1.3')

		expect(comparison.matches.find(({ oldRule }) => oldRule.id === '317.2.b')).toBeUndefined()
		expect(comparison.entries).toContainEqual(
			expect.objectContaining({ kind: 'removed', rule: expect.objectContaining({ id: '317.2.b' }) }),
		)
		expect(comparison.entries).toContainEqual(
			expect.objectContaining({ kind: 'added', rule: expect.objectContaining({ id: '317.2.b' }) }),
		)
	})

	test.each([
		{ type: 'core-rules', from: '1.0', to: '1.1', oldId: '113.1', newId: '113.1' },
		{ type: 'core-rules', from: '1.1', to: '1.2', oldId: '113.1', newId: '113.1' },
		{ type: 'core-rules', from: '1.2', to: '1.3', oldId: '113.1', newId: '114.1' },
		{ type: 'core-rules', from: '1.3', to: '1.4', oldId: '114.1', newId: '113.1' },
		{ type: 'core-rules', from: '1.4', to: '1.5', oldId: '142.4', newId: '142.4' },
		{
			type: 'tournament-rules',
			from: '2026-03-30',
			to: '2026-04-29',
			oldId: '406.1.f.7',
			newId: '406.1.g.7',
		},
		{
			type: 'tournament-rules',
			from: '2026-04-29',
			to: '2026-07-16',
			oldId: '406.1.g.7',
			newId: '406.1.g.7',
		},
		{
			type: 'tournament-rules',
			from: '2026-07-16',
			to: '2026-10-09',
			oldId: '702.2.b',
			newId: '702.2.b',
		},
	] as const)(
		'keeps audited reference-only change $type $oldId to $newId visible',
		({ type, from, to, oldId, newId }) => {
			const comparison = rulesDocuments.family(type).compare(from, to)

			expect(comparison.entries).toContainEqual(
				expect.objectContaining({
					kind: 'modified',
					oldRule: expect.objectContaining({ id: oldId }),
					newRule: expect.objectContaining({ id: newId }),
				}),
			)
		},
	)

	test('accounts for every node exactly once in every registered adjacent comparison', () => {
		for (const type of ['core-rules', 'tournament-rules'] as const) {
			const family = rulesDocuments.family(type)
			const versions = family.registeredVersions.map(({ version }) => version)
			for (let index = 1; index < versions.length; index++) {
				const from = versions[index - 1]
				const to = versions[index]
				const oldDocument = family.get(from)
				const newDocument = family.get(to)
				const comparison = family.compare(from, to)
				const oldAccounted = [
					...comparison.matches.map(({ oldRule }) => oldRule.anchor),
					...comparison.entries.flatMap((entry) => (entry.kind === 'removed' ? [entry.rule.anchor] : [])),
				]
				const newAccounted = [
					...comparison.matches.map(({ newRule }) => newRule.anchor),
					...comparison.entries.flatMap((entry) => (entry.kind === 'added' ? [entry.rule.anchor] : [])),
				]
				const pair = `${type} ${from} to ${to}`

				expect(new Set(oldAccounted).size, `${pair} accounts for an old node more than once`).toBe(
					oldAccounted.length,
				)
				expect(oldAccounted.toSorted(), `${pair} accounts for every old node`).toEqual(
					oldDocument.diffRecords.map(({ anchor }) => anchor).toSorted(),
				)
				expect(new Set(newAccounted).size, `${pair} accounts for a new node more than once`).toBe(
					newAccounted.length,
				)
				expect(newAccounted.toSorted(), `${pair} accounts for every new node`).toEqual(
					newDocument.diffRecords.map(({ anchor }) => anchor).toSorted(),
				)
			}
		}
	})

	test('classifies current rules from the previous registered version', () => {
		const catalog = createCatalog(
			[sourceRule(2, '300.1', 'This rule changed.'), sourceRule(3, '300.2', 'This rule stayed the same.')],
			[
				sourceRule(2, '300.1', 'This rule changed meaningfully.'),
				sourceRule(3, '300.2', 'This rule stayed the same.'),
				sourceRule(4, '300.3', 'This rule is entirely new.'),
			],
		)

		expect(catalog.get('1.0').sections[0].blocks[0].rules.map(({ changeMarker }) => changeMarker)).toEqual([
			undefined,
			undefined,
		])
		expect(catalog.current.sections[0].blocks[0].rules.map(({ changeMarker }) => changeMarker)).toEqual([
			'changed',
			undefined,
			'new',
		])
	})

	test('marks the edited unnumbered occurrence rather than its sibling', () => {
		const catalog = createCatalog(
			[sourceRule(2, null, 'First rule.'), sourceRule(3, null, 'Second rule.')],
			[sourceRule(2, null, 'First rule.'), sourceRule(3, null, 'Second rule changed.')],
			'tournament-rules',
		)

		expect(
			catalog.current.sections[0].blocks[0].rules.map(({ anchor, changeMarker }) => [anchor, changeMarker]),
		).toEqual([
			['U2', undefined],
			['U3', 'changed'],
		])
	})

	test('marks the edited nested duplicate occurrence and memoizes its comparison', () => {
		const catalog = createCatalog(
			[
				sourceRule(2, '300.1', 'Parent.', [
					sourceRule(3, '300.1.a', 'First nested rule.'),
					sourceRule(4, '300.1.a', 'Second nested rule.'),
				]),
			],
			[
				sourceRule(2, '300.1', 'Parent.', [
					sourceRule(3, '300.1.a', 'First nested rule.'),
					sourceRule(4, '300.1.a', 'Second nested rule changed.'),
				]),
			],
		)
		const comparison = catalog.compare('1.0', '1.1')
		const children = catalog.current.sections[0].blocks[0].rules[0].children

		expect(catalog.compare('1.0', '1.1')).toBe(comparison)
		expect(children.map(({ anchor, changeMarker }) => [anchor, changeMarker])).toEqual([
			['R300.1.a', undefined],
			['R300.1.a-2', 'changed'],
		])
	})

	test('retains a Tournament Rules edit that only renumbers a Core Rules reference', () => {
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'tournament-rules',
			currentVersion: '2026-04-29',
			documents: {
				'2026-03-30': { version: '2026-03-30', text: 'Players follow CR 100.' },
				'2026-04-29': { version: '2026-04-29', text: 'Players follow CR 101.' },
			},
			adapt: ({ version, text }) => ({
				...rulesDocument(version, []),
				sections: [
					{
						heading: { sequence: 1, id: '300', text, depth: 2 },
						blocks: [],
					},
				],
			}),
		})

		expect(catalog.compare('2026-03-30', '2026-04-29').entries).toMatchObject([
			{
				kind: 'modified',
				oldRule: { content: [{ kind: 'paragraph', text: 'Players follow CR 100.' }] },
				newRule: { content: [{ kind: 'paragraph', text: 'Players follow CR 101.' }] },
			},
		])
	})

	test('retains a short edit that only renumbers a rule reference', () => {
		const comparison = createCatalog(
			[sourceRule(2, null, 'Rule 421.2.a')],
			[sourceRule(2, null, 'Rule 425.2.a')],
		).compare('1.0', '1.1')

		expect(comparison.entries).toMatchObject([
			{
				kind: 'modified',
				oldRule: { content: [{ kind: 'paragraph', text: 'Rule 421.2.a' }] },
				newRule: { content: [{ kind: 'paragraph', text: 'Rule 425.2.a' }] },
			},
		])
		expect(comparison.matches.at(-1)).toMatchObject({
			oldRule: { content: [{ kind: 'paragraph', text: 'Rule 421.2.a' }] },
			newRule: { content: [{ kind: 'paragraph', text: 'Rule 425.2.a' }] },
		})
	})

	test('uses shared child identity to compare a rewritten parent', () => {
		const comparison = createCatalog(
			[sourceRule(2, '300.1', 'Alpha only.', [sourceRule(3, '300.1.a', 'Unchanged child.')])],
			[sourceRule(2, '300.1', 'Omega entirely.', [sourceRule(3, '300.1.a', 'Unchanged child.')])],
		).compare('1.0', '1.1')

		expect(comparison.entries).toMatchObject([
			{
				kind: 'modified',
				oldRule: { id: '300.1' },
				newRule: { id: '300.1' },
			},
		])
		expect(comparison.matches.map(({ oldRule }) => oldRule.id)).toContain('300.1.a')
	})

	test('compares an edited node that moves beneath an unmatched parent', () => {
		const comparison = createCatalog(
			[
				sourceRule(2, '300.1', 'Alpha parent.', [
					sourceRule(3, '300.1.a', 'Players draw a card after combat.', [
						sourceRule(4, '300.1.a.1', 'Keep this marker until cleanup.'),
					]),
				]),
			],
			[
				sourceRule(2, '300.2', 'Omega destination.', [
					sourceRule(3, '300.2.a', 'Players draw a card after each combat.', [
						sourceRule(4, '300.2.a.1', 'Keep this marker until cleanup.'),
					]),
				]),
			],
		).compare('1.0', '1.1')

		expect(comparison.matches.find(({ oldRule }) => oldRule.id === '300.1.a')?.newRule.id).toBe('300.2.a')
		expect(comparison.matches.find(({ oldRule }) => oldRule.id === '300.1.a.1')?.newRule.id).toBe('300.2.a.1')
		expect(comparison.matches.some(({ oldRule }) => oldRule.id === '300.1')).toBe(false)
		expect(comparison.entries).toContainEqual(
			expect.objectContaining({
				kind: 'modified',
				oldRule: expect.objectContaining({ id: '300.1.a' }),
				newRule: expect.objectContaining({ id: '300.2.a' }),
			}),
		)
	})

	test('hides reordered siblings without content changes', () => {
		const comparison = createCatalog(
			[sourceRule(2, '300.1', 'First instruction.'), sourceRule(3, '300.2', 'Second instruction.')],
			[sourceRule(2, '300.2', 'Second instruction.'), sourceRule(3, '300.1', 'First instruction.')],
		).compare('1.0', '1.1')

		expect(comparison.matches.filter(({ oldRule }) => oldRule.id?.startsWith('300.'))).toHaveLength(2)
		expect(comparison.entries).toEqual([])
	})

	test('does not compare unrelated leaf rules by ID alone', () => {
		const comparison = createCatalog(
			[sourceRule(2, '300.1', 'Alpha only.')],
			[sourceRule(2, '300.1', 'Omega entirely.')],
		).compare('1.0', '1.1')

		expect(comparison.entries.map(({ kind }) => kind).toSorted()).toEqual(['added', 'removed'])
		expect(comparison.matches.some(({ oldRule }) => oldRule.id === '300.1')).toBe(false)
	})

	test('does not compare unrelated parent rules by repeated IDs alone', () => {
		const comparison = createCatalog(
			[sourceRule(2, '300.1', 'Alpha only.', [sourceRule(3, '300.1.a', 'First child.')])],
			[sourceRule(2, '300.1', 'Omega entirely.', [sourceRule(3, '300.1.a', 'Second child.')])],
		).compare('1.0', '1.1')

		expect(comparison.entries.map(({ kind }) => kind).toSorted()).toEqual([
			'added',
			'added',
			'removed',
			'removed',
		])
		expect(comparison.matches.some(({ oldRule }) => oldRule.id === '300.1')).toBe(false)
	})

	test('does not use reused parent and child IDs to join unrelated short text', () => {
		const comparison = createCatalog(
			[sourceRule(2, '300.1', 'Alpha only.', [sourceRule(3, '300.1.a', 'Remedies:')])],
			[sourceRule(2, '300.1', 'Omega entirely.', [sourceRule(3, '300.1.a', 'Remedies:')])],
		).compare('1.0', '1.1')

		expect(comparison.entries.map(({ kind }) => kind).toSorted()).toEqual([
			'added',
			'added',
			'removed',
			'removed',
		])
		expect(comparison.matches.some(({ oldRule }) => oldRule.id === '300.1.a')).toBe(false)
	})

	test('does not match a short phrase contained in a longer unrelated rule', () => {
		const comparison = createCatalog(
			[sourceRule(2, '300.1', 'Draw a card.')],
			[sourceRule(2, '300.1', 'Draw a card after resolving combat at your base.')],
		).compare('1.0', '1.1')

		expect(comparison.entries.map(({ kind }) => kind).toSorted()).toEqual(['added', 'removed'])
		expect(comparison.matches.some(({ oldRule }) => oldRule.id === '300.1')).toBe(false)
	})

	test('leaves competing fuzzy continuations unmatched', () => {
		const comparison = createCatalog(
			[sourceRule(2, '300.1', 'Alpha beta gamma delta.')],
			[
				sourceRule(2, '300.2', 'Alpha beta gamma delta extra.'),
				sourceRule(3, '300.3', 'Alpha beta gamma delta extra more.'),
			],
		).compare('1.0', '1.1')

		expect(comparison.matches.some(({ oldRule }) => oldRule.id === '300.1')).toBe(false)
		expect(
			comparison.entries
				.map((entry) => `${entry.kind}:${entry.kind === 'modified' ? entry.oldRule.id : entry.rule.id}`)
				.toSorted(),
		).toEqual(['added:300.2', 'added:300.3', 'removed:300.1'])
	})

	test('does not match repeated text after a corresponding sibling consumes the other copy', () => {
		const repeatedText = 'Players perform the listed remedy.'
		const comparison = createCatalog(
			[
				sourceRule(2, '300.1', 'Stable parent.', [sourceRule(3, '300.1.a', repeatedText)]),
				sourceRule(4, '300.2', 'Alpha only.', [sourceRule(5, '300.2.a', repeatedText)]),
			],
			[
				sourceRule(2, '300.1', 'Stable parent.', [sourceRule(3, '300.1.a', repeatedText)]),
				sourceRule(4, '300.3', 'Omega entirely.', [sourceRule(5, '300.3.a', repeatedText)]),
			],
		).compare('1.0', '1.1')

		expect(
			comparison.entries
				.map((entry) =>
					entry.kind === 'modified'
						? `${entry.oldRule.id}->${entry.newRule.id}`
						: `${entry.kind}:${entry.rule.id}`,
				)
				.toSorted(),
		).toEqual(['added:300.3', 'added:300.3.a', 'removed:300.2', 'removed:300.2.a'])
	})

	test('does not compare unrelated headings by ID alone', () => {
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.1',
			documents: {
				'1.0': { version: '1.0', heading: 'Alpha only.' },
				'1.1': { version: '1.1', heading: 'Omega entirely.' },
			},
			adapt: ({ version, heading }) => ({
				version,
				sections: [{ heading: { sequence: 1, id: '300', text: heading, depth: 2 }, blocks: [] }],
			}),
		})

		expect(
			catalog
				.compare('1.0', '1.1')
				.entries.map(({ kind }) => kind)
				.toSorted(),
		).toEqual(['added', 'removed'])
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
	] as const)('prioritizes text continuation for $name', ({ oldRules, newRules, expected }) => {
		expect(changedRuleIds(oldRules, newRules)).toEqual(expected)
	})

	test('prefers an exact renumbered title over partial title matches', () => {
		expect(
			changedRuleIds(
				[
					{ id: '477.1', text: '1. Trait-Altering Effects' },
					{ id: '477.1.a', text: 'Copy effects are applied in this layer.' },
				],
				[
					{ id: '479.1', text: '1. Copy Effects' },
					{ id: '479.1.a', text: 'All copy effects are applied in this layer.' },
					{ id: '479.2', text: '2. Trait-Altering Effects' },
				],
			),
		).toEqual(['added:479.1', '477.1->479.2', '477.1.a->479.1.a'])
	})
})
