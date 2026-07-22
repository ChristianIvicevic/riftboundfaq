import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRulingRelationIndex, getRulingRelations } from '../src/lib/ruling-relations.ts'

const page = (url, title, anchors, rulingRelations) => ({
	url,
	path: `content${url}.mdx`,
	data: {
		title,
		toc: anchors.map((anchor) => ({ url: `#${anchor}` })),
		rulingRelations,
	},
})

test('ruling relations generate canonical and reverse page entries', () => {
	const pages = [
		page(
			'/general-rules/costs',
			'Costs',
			['countered-costs'],
			[
				{
					id: 'countered-costs',
					anchor: 'countered-costs',
					question: 'Are paid costs refunded?',
					appliesTo: ['/cards/zeta', '/cards/alpha'],
				},
			],
		),
		page('/cards/alpha', 'Alpha', ['countering']),
		page('/cards/zeta', 'Zeta', ['countering']),
	]
	const index = buildRulingRelationIndex(pages)
	const canonical = getRulingRelations(index, '/general-rules/costs')
	const participant = getRulingRelations(index, '/cards/alpha')

	assert.equal(canonical.owned.length, 1)
	assert.equal(canonical.owned[0].canonicalUrl, '/general-rules/costs#countered-costs')
	assert.deepEqual(
		canonical.owned[0].participantPages.map(({ title }) => title),
		['Alpha', 'Zeta'],
	)
	assert.equal(participant.incoming.length, 1)
	assert.equal(participant.incoming[0].question, 'Are paid costs refunded?')
	assert.equal(participant.incoming[0].canonicalPage.title, 'Costs')
	assert.deepEqual(getRulingRelations(index, '/cards/unrelated'), { owned: [], incoming: [] })
})

test('ruling relations reject duplicate IDs', () => {
	assert.throws(
		() =>
			buildRulingRelationIndex([
				page(
					'/cards/alpha',
					'Alpha',
					['first'],
					[{ id: 'duplicate', anchor: 'first', question: 'First?', appliesTo: ['/cards/beta'] }],
				),
				page(
					'/cards/beta',
					'Beta',
					['second'],
					[{ id: 'duplicate', anchor: 'second', question: 'Second?', appliesTo: ['/cards/alpha'] }],
				),
			]),
		/Duplicate ruling relation ID "duplicate"/u,
	)
})

test('ruling relations reject missing canonical anchors', () => {
	assert.throws(
		() =>
			buildRulingRelationIndex([
				page(
					'/cards/alpha',
					'Alpha',
					['existing'],
					[{ id: 'missing-anchor', anchor: 'missing', question: 'Missing?', appliesTo: ['/cards/beta'] }],
				),
				page('/cards/beta', 'Beta', ['answer']),
			]),
		/missing anchor \/cards\/alpha#missing/u,
	)
})

test('ruling relations reject missing, duplicate, and self participant routes', () => {
	assert.throws(
		() =>
			buildRulingRelationIndex([
				page(
					'/cards/alpha',
					'Alpha',
					['question'],
					[{ id: 'missing-page', anchor: 'question', question: 'Question?', appliesTo: ['/cards/missing'] }],
				),
			]),
		/references missing page \/cards\/missing/u,
	)

	assert.throws(
		() =>
			buildRulingRelationIndex([
				page(
					'/cards/alpha',
					'Alpha',
					['question'],
					[
						{
							id: 'duplicate-page',
							anchor: 'question',
							question: 'Question?',
							appliesTo: ['/cards/beta', '/cards/beta'],
						},
					],
				),
				page('/cards/beta', 'Beta', ['answer']),
			]),
		/contains duplicate participant \/cards\/beta/u,
	)

	assert.throws(
		() =>
			buildRulingRelationIndex([
				page(
					'/cards/alpha',
					'Alpha',
					['question'],
					[{ id: 'self-page', anchor: 'question', question: 'Question?', appliesTo: ['/cards/alpha'] }],
				),
			]),
		/cannot reference its own page \/cards\/alpha/u,
	)
})
