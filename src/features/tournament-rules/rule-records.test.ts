import { describe, expect, test } from 'vitest'
import { prepareTournamentRulesDiff } from '@/features/tournament-rules/rule-records'
import type { TournamentRuleNode, TournamentRulesDocument } from '@/features/tournament-rules/types'

const rule = (
	sequence: number,
	id: string | null,
	label: string | null,
	text: string,
): TournamentRuleNode => ({
	sequence,
	id,
	label,
	content: [{ kind: 'paragraph', text }],
	children: [],
})

describe('prepareTournamentRulesDiff', () => {
	test('assigns stable destinations to duplicate and unnumbered records', () => {
		const document: TournamentRulesDocument = {
			schemaVersion: 1,
			version: '2026-03-30',
			sections: [
				{
					heading: { sequence: 1, id: '700', text: 'Policy Violations' },
					blocks: [
						{
							kind: 'rules',
							rules: [
								rule(2, '703.4.a.1', '703.4.a.1.', 'First occurrence.'),
								rule(3, '703.4.a.1', '703.4.a.1.', 'Second occurrence.'),
								rule(4, null, null, 'Unnumbered source row.'),
							],
						},
					],
				},
			],
		}

		const prepared = prepareTournamentRulesDiff(document)

		expect(prepared.rules.map(({ id }) => id)).toStrictEqual([
			'700::1',
			'703.4.a.1::1',
			'703.4.a.1::2',
			'unnumbered::1',
		])
		expect([...prepared.details]).toStrictEqual([
			['700::1', { anchor: 'R700', label: '700.' }],
			['703.4.a.1::1', { anchor: 'R703.4.a.1', label: '703.4.a.1.' }],
			['703.4.a.1::2', { anchor: 'R703.4.a.1-2', label: '703.4.a.1.' }],
			['unnumbered::1', { anchor: 'U4', label: 'Unnumbered' }],
		])
	})
})
