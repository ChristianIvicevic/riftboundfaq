import { describe, expect, test } from 'vitest'
import type { TournamentRuleNode, TournamentRulesSection } from '@/lib/rules/tournament-rules-document'
import type { TournamentRulesSourceRow } from './source-rows'
import { structureTournamentRows } from './structure'

function row(
	sequence: number,
	kind: TournamentRulesSourceRow['kind'],
	id: string | null,
	text: string,
): TournamentRulesSourceRow {
	return {
		sequence,
		kind,
		label: id ? { sourceText: `${id}.`, id, text: `${id}.`, normalization: 'unchanged' } : null,
		text,
		activity: { status: 'active', removalEvidence: null },
		sourcePages: { start: 1, end: 1 },
	}
}

function ruleSequences(rules: readonly TournamentRuleNode[]): number[] {
	return rules.flatMap((rule) => [rule.sequence, ...ruleSequences(rule.children)])
}

function firstRuleBlock(sections: readonly TournamentRulesSection[]): readonly TournamentRuleNode[] {
	const block = sections[0]?.blocks[0]
	if (!block || block.kind !== 'rules') throw new Error('expected the first section block to contain rules')
	return block.rules
}

describe('structureTournamentRows', () => {
	test('rejects an active row that would be lost', () => {
		const rows = [row(1, 'rule', null, 'Unnumbered introduction'), row(2, 'primary-heading', '1', 'Play')]

		expect(() => structureTournamentRows(rows)).toThrow(/did not preserve active row 1/u)
	})

	test('preserves an unnumbered rule as a diagnostic', () => {
		const rows = [
			row(1, 'primary-heading', '1', 'Play'),
			row(2, 'rule', '1.1', 'A numbered rule.'),
			row(3, 'rule', null, 'An unnumbered rule.'),
		]

		const { sections, diagnostics } = structureTournamentRows(rows)

		expect(firstRuleBlock(sections).map(({ sequence }) => sequence)).toStrictEqual([2, 3])
		expect(diagnostics.map(({ code, sequence }) => ({ code, sequence }))).toStrictEqual([
			{ code: 'unnumbered-rule', sequence: 3 },
		])
	})

	test('preserves an orphan rule as a diagnostic', () => {
		const rows = [
			row(1, 'primary-heading', '1', 'Play'),
			row(2, 'rule', '1.1', 'A numbered rule.'),
			row(3, 'rule', '1.3.1', 'A rule whose parent is missing.'),
		]

		const { sections, diagnostics } = structureTournamentRows(rows)

		expect(firstRuleBlock(sections).map(({ sequence }) => sequence)).toStrictEqual([2, 3])
		expect(diagnostics.map(({ code, sequence }) => ({ code, sequence }))).toStrictEqual([
			{ code: 'orphan-rule', sequence: 3 },
		])
	})

	test('preserves order when an intermediate parent number is missing', () => {
		const rows = [
			row(1, 'primary-heading', '509', 'Gameplay Decisions'),
			row(2, 'rule', '509.4', 'Decisions'),
			row(3, 'rule', '509.4.c', 'Movement decisions'),
			row(4, 'rule', '509.4.c.1.1', 'An example with a missing parent number.'),
			row(5, 'rule', '509.4.d', 'Rune decisions'),
		]

		const { sections, diagnostics } = structureTournamentRows(rows)

		expect(ruleSequences(firstRuleBlock(sections))).toStrictEqual([2, 3, 4, 5])
		expect(diagnostics).toStrictEqual([
			{
				code: 'orphan-rule',
				sequence: 4,
				id: '509.4.c.1.1',
				expectedParentId: '509.4.c.1',
			},
		])
	})

	test('structures complete sections without restoring inactive rows', () => {
		const rows = [
			row(1, 'primary-heading', '100', 'Tournament Fundamentals'),
			row(2, 'rule', '100.1', 'Section preamble.'),
			row(3, 'secondary-heading', '100.2', 'Player Responsibilities'),
			row(4, 'rule', '100.2.1', 'A responsibility.'),
			row(5, 'rule', '100.2.1.a', 'Example: A nested example.'),
			row(6, 'rule', '100.3', 'See Appendix A.'),
			{
				...row(7, 'rule', '100.4', 'Removed text.'),
				activity: {
					status: 'removed',
					removalEvidence: { text: '100.4. Removed text.', coverage: 'complete' },
				},
			} satisfies TournamentRulesSourceRow,
		]

		const { sections, diagnostics } = structureTournamentRows(rows)

		expect(diagnostics).toStrictEqual([])
		expect(sections).toMatchObject([
			{
				heading: { sequence: 1, id: '100', text: 'Tournament Fundamentals' },
				blocks: [
					{
						kind: 'rules',
						rules: [{ id: '100.1', content: [{ kind: 'paragraph', text: 'Section preamble.' }] }],
					},
					{
						kind: 'subsection',
						heading: { id: '100.2', text: 'Player Responsibilities' },
						rules: [
							{
								id: '100.2.1',
								children: [
									{ id: '100.2.1.a', content: [{ kind: 'example', text: 'Example: A nested example.' }] },
								],
							},
						],
					},
					{
						kind: 'rules',
						rules: [{ id: '100.3', content: [{ kind: 'reference', text: 'See Appendix A.' }] }],
					},
				],
			},
		])
	})
})
