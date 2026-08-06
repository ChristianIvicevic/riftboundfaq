import { describe, expect, test } from 'vitest'
import { buildRulingRelationIndex, getRulingRelations } from '@/lib/content/ruling-relations'
import type { RulingRelationDefinitions } from '@/lib/content/ruling-relations-schema'

type RelationPage = Parameters<typeof buildRulingRelationIndex>[0][number]

const page = ({
	url,
	title,
	anchors = [],
	rulingRelations,
	headingTitles = {},
}: {
	url: string
	title: string
	anchors?: readonly string[]
	rulingRelations?: RulingRelationDefinitions
	headingTitles?: Record<string, unknown>
}): RelationPage => ({
	url,
	path: `content${url}.mdx`,
	data: {
		title,
		toc: anchors.map((anchor) => ({ url: `#${anchor}` })),
		structuredData: {
			headings: anchors.map((anchor) => ({ id: anchor, content: headingTitles[anchor] ?? anchor })),
		},
		rulingRelations,
	},
})

describe('buildRulingRelationIndex', () => {
	test('generates canonical and reverse page entries', () => {
		const pages = [
			page({
				url: '/general-rules/costs',
				title: 'Costs',
				anchors: ['countered-costs'],
				rulingRelations: { 'countered-costs': ['/cards/zeta', '/cards/alpha'] },
				headingTitles: { 'countered-costs': 'Are paid costs refunded?' },
			}),
			page({ url: '/cards/alpha', title: 'Alpha', anchors: ['countering'] }),
			page({ url: '/cards/zeta', title: 'Zeta', anchors: ['countering'] }),
		]
		const index = buildRulingRelationIndex(pages)
		const canonical = getRulingRelations(index, '/general-rules/costs')
		const participant = getRulingRelations(index, '/cards/alpha')

		expect(canonical.owned).toHaveLength(1)
		expect(canonical.owned[0].canonicalUrl).toBe('/general-rules/costs#countered-costs')
		expect(canonical.owned[0].participantPages.map(({ title }) => title)).toStrictEqual(['Alpha', 'Zeta'])
		expect(participant.incoming).toHaveLength(1)
		expect(participant.incoming[0].question).toBe('Are paid costs refunded?')
		expect(participant.incoming[0].canonicalTitle).toBe('Costs')
	})

	test('derives distinct identities from canonical URLs', () => {
		const index = buildRulingRelationIndex([
			page({
				url: '/cards/alpha',
				title: 'Alpha',
				anchors: ['interaction'],
				rulingRelations: { interaction: ['/cards/gamma'] },
			}),
			page({
				url: '/cards/beta',
				title: 'Beta',
				anchors: ['interaction'],
				rulingRelations: { interaction: ['/cards/gamma'] },
			}),
			page({ url: '/cards/gamma', title: 'Gamma' }),
		])

		expect(
			getRulingRelations(index, '/cards/gamma').incoming.map(({ canonicalUrl }) => canonicalUrl),
		).toStrictEqual(['/cards/alpha#interaction', '/cards/beta#interaction'])
	})

	test('rejects a missing canonical anchor', () => {
		expect(() =>
			buildRulingRelationIndex([
				page({
					url: '/cards/alpha',
					title: 'Alpha',
					anchors: ['existing'],
					rulingRelations: { missing: ['/cards/beta'] },
				}),
				page({ url: '/cards/beta', title: 'Beta', anchors: ['answer'] }),
			]),
		).toThrow(/missing anchor \/cards\/alpha#missing/u)
	})

	test('rejects a heading without a plain-text structured title', () => {
		expect(() =>
			buildRulingRelationIndex([
				page({
					url: '/cards/alpha',
					title: 'Alpha',
					anchors: ['question'],
					rulingRelations: { question: ['/cards/beta'] },
					headingTitles: { question: { type: 'strong' } },
				}),
				page({ url: '/cards/beta', title: 'Beta' }),
			]),
		).toThrow(/must have a plain-text title/u)
	})

	test('rejects a missing participant route', () => {
		expect(() =>
			buildRulingRelationIndex([
				page({
					url: '/cards/alpha',
					title: 'Alpha',
					anchors: ['question'],
					rulingRelations: { question: ['/cards/missing'] },
				}),
			]),
		).toThrow(/references missing page \/cards\/missing/u)
	})

	test('rejects a duplicate participant route', () => {
		expect(() =>
			buildRulingRelationIndex([
				page({
					url: '/cards/alpha',
					title: 'Alpha',
					anchors: ['question'],
					rulingRelations: { question: ['/cards/beta', '/cards/beta'] },
				}),
				page({ url: '/cards/beta', title: 'Beta', anchors: ['answer'] }),
			]),
		).toThrow(/contains duplicate participant \/cards\/beta/u)
	})

	test('rejects a self-referencing participant route', () => {
		expect(() =>
			buildRulingRelationIndex([
				page({
					url: '/cards/alpha',
					title: 'Alpha',
					anchors: ['question'],
					rulingRelations: { question: ['/cards/alpha'] },
				}),
			]),
		).toThrow(/cannot reference its own page \/cards\/alpha/u)
	})
})

describe('getRulingRelations', () => {
	test('returns empty collections for an unrelated page', () => {
		const index = buildRulingRelationIndex([page({ url: '/cards/alpha', title: 'Alpha' })])

		expect(getRulingRelations(index, '/cards/unrelated')).toStrictEqual({ owned: [], incoming: [] })
	})
})
