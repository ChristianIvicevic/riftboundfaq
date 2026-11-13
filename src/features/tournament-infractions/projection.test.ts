import { Result } from 'effect'
import { describe, expect, test } from 'vitest'
import type {
	CompiledRulesDocument,
	RulesReferenceTarget,
	TraversedRule,
	TraversedRulesBlock,
} from '@/features/rules-documents/family-catalog'
import { projectTournamentInfractions } from '@/features/tournament-infractions/projection'

const CATEGORY_NAMES = {
	'702': 'Game Play Errors',
	'703': 'Tournament Errors',
	'704': 'Unsporting Conduct',
} as const
const EMPTY_REFERENCE_TARGETS = new Map<string, RulesReferenceTarget>()
const EMPTY_LOOKUP_TEXT = new Map<string, string>()

function rule(id: string, text: string, anchor = `R${id}`): TraversedRule {
	return {
		id,
		label: `${id}.`,
		anchor,
		content: [{ kind: 'paragraph', text }],
		children: [],
	}
}

function category(
	id: keyof typeof CATEGORY_NAMES,
	categoryAnchor = `R${id}`,
	infractionAnchor = `R${id}.2`,
): TraversedRulesBlock {
	return {
		kind: 'subsection',
		heading: { id, text: CATEGORY_NAMES[id], anchor: categoryAnchor, depth: 3 },
		rules: [
			rule(`${id}.1`, 'Overview'),
			rule(`${id}.2`, `${CATEGORY_NAMES[id]} Infraction [Warning]: Definition.`, infractionAnchor),
		],
	}
}

function tournamentRulesDocument(
	blocks: readonly TraversedRulesBlock[] = [category('702'), category('703'), category('704')],
): CompiledRulesDocument {
	return {
		identity: {
			type: 'tournament-rules',
			version: '2026-01-01',
			name: null,
			status: 'current',
		},
		sections: [
			{
				heading: {
					id: '700',
					text: 'Enforcement and Penalties',
					anchor: 'R700',
					depth: 2,
				},
				blocks,
			},
		],
		navigation: [],
		diffRecords: [],
		referenceTarget(id) {
			return EMPTY_REFERENCE_TARGETS.get(id)
		},
		lookupText(id) {
			return EMPTY_LOOKUP_TEXT.get(id)
		},
	}
}

describe('Tournament Infractions projection', () => {
	// Compiled PDF fixtures cannot produce unsafe or colliding anchors, so those defenses live at this seam.
	test('preserves validated source anchors for deep links', () => {
		const index = Result.getOrThrow(projectTournamentInfractions(tournamentRulesDocument()))

		expect(
			index.categories.map(({ anchor, infractions }) => ({
				anchor,
				infractions: infractions.map((infraction) => infraction.anchor),
			})),
		).toEqual([
			{ anchor: 'R702', infractions: ['R702.2'] },
			{ anchor: 'R703', infractions: ['R703.2'] },
			{ anchor: 'R704', infractions: ['R704.2'] },
		])
	})

	test('rejects an unsafe category fragment with source context', () => {
		const result = projectTournamentInfractions(
			tournamentRulesDocument([category('702', 'R702/details'), category('703'), category('704')]),
		)

		expect(Result.isFailure(result)).toBe(true)
		if (!Result.isFailure(result)) throw new Error('Expected Tournament Infractions projection to fail')
		expect(result.failure.message).toBe(
			'Tournament Rules 2026-01-01, category 702: unsafe infraction category fragment "R702/details"',
		)
	})

	test('rejects an unsafe top-level infraction fragment with source context', () => {
		const result = projectTournamentInfractions(
			tournamentRulesDocument([category('702', 'R702', 'R702.2/details'), category('703'), category('704')]),
		)

		expect(Result.isFailure(result)).toBe(true)
		if (!Result.isFailure(result)) throw new Error('Expected Tournament Infractions projection to fail')
		expect(result.failure.message).toBe(
			'Tournament Rules 2026-01-01, category 702, rule 702.2: unsafe infraction fragment "R702.2/details"',
		)
	})

	test('rejects duplicate category fragments with source context', () => {
		const result = projectTournamentInfractions(
			tournamentRulesDocument([category('702'), category('703', 'R702'), category('704')]),
		)

		expect(Result.isFailure(result)).toBe(true)
		if (!Result.isFailure(result)) throw new Error('Expected Tournament Infractions projection to fail')
		expect(result.failure.message).toBe(
			'Tournament Rules 2026-01-01, category 703: duplicate infraction category fragment "R702"',
		)
	})

	test('rejects duplicate top-level infraction fragments with source context', () => {
		const result = projectTournamentInfractions(
			tournamentRulesDocument([category('702'), category('703', 'R703', 'R702.2'), category('704')]),
		)

		expect(Result.isFailure(result)).toBe(true)
		if (!Result.isFailure(result)) throw new Error('Expected Tournament Infractions projection to fail')
		expect(result.failure.message).toBe(
			'Tournament Rules 2026-01-01, category 703, rule 703.2: duplicate infraction fragment "R702.2"',
		)
	})
})
