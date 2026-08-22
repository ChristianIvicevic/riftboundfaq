import { describe, expect, test } from 'vitest'
import {
	buildRulingCrossReferenceIndex,
	getRulingCrossReferences,
} from '@/lib/content/ruling-cross-references'
import type { RulingCrossReferenceDefinitions } from '@/lib/content/ruling-cross-references-schema'

type ReferencePage = Parameters<typeof buildRulingCrossReferenceIndex>[0][number]

const page = ({
	url,
	title,
	headings = [],
	rulingCrossReferences,
}: {
	url: string
	title: string
	headings?: readonly { anchor: string; depth?: number; title?: unknown }[]
	rulingCrossReferences?: RulingCrossReferenceDefinitions
}): ReferencePage => ({
	url,
	path: `content${url}.mdx`,
	data: {
		title,
		toc: headings.map(({ anchor, depth = 2 }) => ({ url: `#${anchor}`, depth })),
		structuredData: {
			headings: headings.map(({ anchor, title: headingTitle = anchor }) => ({
				id: anchor,
				content: headingTitle,
			})),
		},
		rulingCrossReferences,
	},
})

describe('buildRulingCrossReferenceIndex', () => {
	test('resolves directional Canonical references and bidirectional Interaction relations', () => {
		const index = buildRulingCrossReferenceIndex([
			page({
				url: '/cards/promising-future',
				title: 'Promising Future',
				headings: [
					{
						anchor: 'brynhir-thundersong',
						title:
							"Does Brynhir Thundersong stop an opponent's card chosen with Promising Future from being played?",
					},
				],
				rulingCrossReferences: {
					'brynhir-thundersong': [
						{
							type: 'canonical',
							destination: '/general-rules/playing-cards#play-definition',
						},
						{
							type: 'interaction',
							destination: '/cards/brynhir-thundersong#existing-cards',
						},
					],
				},
			}),
			page({
				url: '/cards/brynhir-thundersong',
				title: 'Brynhir Thundersong',
				headings: [
					{
						anchor: 'existing-cards',
						title: 'Does Brynhir Thundersong stop cards already on the chain?',
					},
				],
				rulingCrossReferences: {
					'existing-cards': [
						{
							type: 'canonical',
							destination: '/general-rules/playing-cards#play-definition',
						},
					],
				},
			}),
			page({
				url: '/general-rules/playing-cards',
				title: 'Playing Cards',
				headings: [{ anchor: 'play-definition', title: 'What does "play" mean on a card?' }],
			}),
		])

		expect(getRulingCrossReferences(index, '/cards/promising-future', 'brynhir-thundersong')).toStrictEqual([
			{
				type: 'interaction',
				question: 'Does Brynhir Thundersong stop cards already on the chain?',
				url: '/cards/brynhir-thundersong#existing-cards',
			},
			{
				type: 'canonical',
				question: 'What does "play" mean on a card?',
				url: '/general-rules/playing-cards#play-definition',
			},
		])
		expect(getRulingCrossReferences(index, '/cards/brynhir-thundersong', 'existing-cards')).toStrictEqual([
			{
				type: 'interaction',
				question:
					"Does Brynhir Thundersong stop an opponent's card chosen with Promising Future from being played?",
				url: '/cards/promising-future#brynhir-thundersong',
			},
			{
				type: 'canonical',
				question: 'What does "play" mean on a card?',
				url: '/general-rules/playing-cards#play-definition',
			},
		])
		expect(getRulingCrossReferences(index, '/general-rules/playing-cards', 'play-definition')).toStrictEqual(
			[],
		)
	})

	test.each([
		{
			name: 'missing pages',
			pages: [
				page({
					url: '/cards/alpha',
					title: 'Alpha',
					headings: [{ anchor: 'answer' }],
					rulingCrossReferences: {
						answer: [{ type: 'canonical', destination: '/cards/missing#answer' }],
					},
				}),
			],
			error: /references missing page \/cards\/missing/u,
		},
		{
			name: 'missing anchors',
			pages: [
				page({
					url: '/cards/alpha',
					title: 'Alpha',
					headings: [{ anchor: 'answer' }],
					rulingCrossReferences: {
						answer: [{ type: 'canonical', destination: '/cards/beta#missing' }],
					},
				}),
				page({ url: '/cards/beta', title: 'Beta', headings: [{ anchor: 'answer' }] }),
			],
			error: /references missing anchor \/cards\/beta#missing/u,
		},
		{
			name: 'non-H2 anchors',
			pages: [
				page({
					url: '/cards/alpha',
					title: 'Alpha',
					headings: [{ anchor: 'answer' }],
					rulingCrossReferences: {
						answer: [{ type: 'canonical', destination: '/cards/beta#supporting' }],
					},
				}),
				page({ url: '/cards/beta', title: 'Beta', headings: [{ anchor: 'supporting', depth: 3 }] }),
			],
			error: /must reference an H2 Ruling answer \/cards\/beta#supporting/u,
		},
		{
			name: 'duplicate relationships',
			pages: [
				page({
					url: '/cards/alpha',
					title: 'Alpha',
					headings: [{ anchor: 'answer' }],
					rulingCrossReferences: {
						answer: [
							{ type: 'canonical', destination: '/cards/beta#answer' },
							{ type: 'canonical', destination: '/cards/beta#answer' },
						],
					},
				}),
				page({ url: '/cards/beta', title: 'Beta', headings: [{ anchor: 'answer' }] }),
			],
			error: /duplicate canonical relationship/u,
		},
		{
			name: 'self-relations',
			pages: [
				page({
					url: '/cards/alpha',
					title: 'Alpha',
					headings: [{ anchor: 'answer' }],
					rulingCrossReferences: {
						answer: [{ type: 'interaction', destination: '/cards/alpha#answer' }],
					},
				}),
			],
			error: /cannot reference itself/u,
		},
		{
			name: 'incompatible directionality',
			pages: [
				page({
					url: '/cards/alpha',
					title: 'Alpha',
					headings: [{ anchor: 'answer' }],
					rulingCrossReferences: {
						answer: [{ type: 'canonical', destination: '/cards/beta#answer' }],
					},
				}),
				page({
					url: '/cards/beta',
					title: 'Beta',
					headings: [{ anchor: 'answer' }],
					rulingCrossReferences: {
						answer: [{ type: 'canonical', destination: '/cards/alpha#answer' }],
					},
				}),
			],
			error: /incompatible directionality/u,
		},
		{
			name: 'non-plain destination labels',
			pages: [
				page({
					url: '/cards/alpha',
					title: 'Alpha',
					headings: [{ anchor: 'answer' }],
					rulingCrossReferences: {
						answer: [{ type: 'canonical', destination: '/cards/beta#answer' }],
					},
				}),
				page({
					url: '/cards/beta',
					title: 'Beta',
					headings: [{ anchor: 'answer', title: { type: 'strong' } }],
				}),
			],
			error: /must have a plain-text destination label/u,
		},
	])('rejects $name', ({ pages, error }) => {
		expect(() => buildRulingCrossReferenceIndex(pages)).toThrow(error)
	})
})

describe('getRulingCrossReferences', () => {
	test('returns an empty collection for an unrelated answer', () => {
		const index = buildRulingCrossReferenceIndex([
			page({ url: '/cards/alpha', title: 'Alpha', headings: [{ anchor: 'answer' }] }),
		])

		expect(getRulingCrossReferences(index, '/cards/alpha', 'answer')).toStrictEqual([])
	})
})
