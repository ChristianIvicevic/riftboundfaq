import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRulingRelationIndex, getRulingRelations } from '../src/lib/ruling-relations.ts'

const page = (url, title, anchors, rulingRelations, headingTitles = {}) => ({
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

test('ruling relations generate canonical and reverse page entries', () => {
	const pages = [
		page(
			'/general-rules/costs',
			'Costs',
			['countered-costs'],
			{ 'countered-costs': ['/cards/zeta', '/cards/alpha'] },
			{ 'countered-costs': 'Are paid costs refunded?' },
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
	assert.equal(participant.incoming[0].canonicalTitle, 'Costs')
	assert.deepEqual(getRulingRelations(index, '/cards/unrelated'), { owned: [], incoming: [] })
})

test('ruling relations derive distinct identities from canonical URLs', () => {
	const index = buildRulingRelationIndex([
		page('/cards/alpha', 'Alpha', ['interaction'], { interaction: ['/cards/gamma'] }),
		page('/cards/beta', 'Beta', ['interaction'], { interaction: ['/cards/gamma'] }),
		page('/cards/gamma', 'Gamma', []),
	])

	assert.deepEqual(
		getRulingRelations(index, '/cards/gamma').incoming.map(({ canonicalUrl }) => canonicalUrl),
		['/cards/alpha#interaction', '/cards/beta#interaction'],
	)
})

test('ruling relations reject missing canonical anchors', () => {
	assert.throws(
		() =>
			buildRulingRelationIndex([
				page('/cards/alpha', 'Alpha', ['existing'], { missing: ['/cards/beta'] }),
				page('/cards/beta', 'Beta', ['answer']),
			]),
		/missing anchor \/cards\/alpha#missing/u,
	)
})

test('ruling relations reject headings without plain-text structured titles', () => {
	assert.throws(
		() =>
			buildRulingRelationIndex([
				page(
					'/cards/alpha',
					'Alpha',
					['question'],
					{ question: ['/cards/beta'] },
					{ question: { type: 'strong' } },
				),
				page('/cards/beta', 'Beta', []),
			]),
		/must have a plain-text title/u,
	)
})

test('ruling relations reject missing, duplicate, and self participant routes', () => {
	assert.throws(
		() =>
			buildRulingRelationIndex([
				page('/cards/alpha', 'Alpha', ['question'], { question: ['/cards/missing'] }),
			]),
		/references missing page \/cards\/missing/u,
	)

	assert.throws(
		() =>
			buildRulingRelationIndex([
				page('/cards/alpha', 'Alpha', ['question'], { question: ['/cards/beta', '/cards/beta'] }),
				page('/cards/beta', 'Beta', ['answer']),
			]),
		/contains duplicate participant \/cards\/beta/u,
	)

	assert.throws(
		() =>
			buildRulingRelationIndex([page('/cards/alpha', 'Alpha', ['question'], { question: ['/cards/alpha'] })]),
		/cannot reference its own page \/cards\/alpha/u,
	)
})
