import assert from 'node:assert/strict'
import test from 'node:test'
import { TOURNAMENT_RULES_2026_04_29 } from '../src/generated/rules/tournament-rules/v2026-04-29.ts'
import { TOURNAMENT_RULES_2026_07_16 } from '../src/generated/rules/tournament-rules/v2026-07-16.ts'
import { diffRuleSets } from '../src/lib/rules/diff.ts'

const rule = (id, text) => ({ id, lines: [text] })

test('diffRuleSets reports same-ID text changes as modifications', () => {
	const entries = diffRuleSets([rule('100', 'Original text.')], [rule('100', 'Updated text.')])

	assert.equal(entries.length, 1)
	assert.equal(entries[0].kind, 'modified')
	assert.equal(entries[0].oldId, '100')
	assert.equal(entries[0].newId, '100')
})

test('diffRuleSets can hide or show renumbering', () => {
	const oldRules = [rule('100', 'Unchanged text.')]
	const newRules = [rule('101', 'Unchanged text.')]

	assert.deepEqual(diffRuleSets(oldRules, newRules), [])
	assert.deepEqual(
		diffRuleSets(oldRules, newRules, { hideRenumbering: false }).map((entry) => [
			entry.kind,
			entry.kind === 'modified' ? entry.oldId : null,
			entry.kind === 'modified' ? entry.newId : null,
		]),
		[['modified', '100', '101']],
	)
})

test('diffRuleSets can hide or show reference-only changes', () => {
	const oldRules = [rule('200', 'See rule 100.')]
	const newRules = [rule('200', 'See rule 101.')]

	assert.deepEqual(diffRuleSets(oldRules, newRules), [])
	assert.equal(diffRuleSets(oldRules, newRules, { hideReferenceOnlyChanges: false })[0].kind, 'modified')
})

test('diffRuleSets recognizes Tournament Rules reference syntax', () => {
	const cases = [
		['See CR 448.1.a. for Final Point details.', 'See CR 469.1.a. for Final Point details.'],
		['See 506.3.d. for examples of observable impact.', 'See 506.3.e. for examples of observable impact.'],
		['proceed to 408.4.c.3 and 408.4.d', 'proceed to 408.4.c.4 and 408.4.e'],
		['perform steps 406.1.c.-406.1.e.3', 'perform steps 406.1.d.-406.1.f.3'],
	]

	for (const [oldText, newText] of cases) {
		assert.deepEqual(
			diffRuleSets([rule('200', oldText)], [rule('200', newText)], { referenceSyntax: 'tournament' }),
			[],
		)
	}
})

test('diffRuleSets retains the complete diff when other wording changes with a reference', () => {
	const oldText = 'See CR 448.1.a. for Final Point details.'
	const newText = 'See CR 471.1.a. for updated Final Point restrictions.'
	const [entry] = diffRuleSets([rule('200', oldText)], [rule('200', newText)], {
		referenceSyntax: 'tournament',
	})

	assert.equal(entry.kind, 'modified')
	assert.equal(entry.oldText.map((token) => token.text).join(''), oldText)
	assert.equal(entry.newText.map((token) => token.text).join(''), newText)
})

test('diffRuleSets aligns duplicate text without hiding a removal', () => {
	const entries = diffRuleSets(
		[rule('100', 'Identical text.'), rule('101', 'Identical text.')],
		[rule('100', 'Identical text.')],
	)

	assert.deepEqual(entries, [{ kind: 'removed', rule: rule('101', 'Identical text.') }])
})

test('Tournament Rules 202 restructuring remains stably aligned', () => {
	const entries = diffRuleSets(TOURNAMENT_RULES_2026_04_29, TOURNAMENT_RULES_2026_07_16, {
		hideRenumbering: true,
		hideReferenceOnlyChanges: true,
		prioritizeTextSimilarity: true,
		referenceSyntax: 'tournament',
	})
	const section202 = entries
		.filter((entry) => (entry.kind === 'modified' ? entry.newId : entry.rule.id).startsWith('202'))
		.map((entry) =>
			entry.kind === 'modified' ? [entry.kind, entry.oldId, entry.newId] : [entry.kind, entry.rule.id],
		)

	assert.equal(entries.length, 70)
	assert.deepEqual(section202, [
		['modified', '202', '202'],
		['added', '202.1'],
		['added', '202.1.c'],
		['added', '202.2'],
		['modified', '202.3', '202.2.a'],
		['added', '202.2.a.1'],
		['removed', '202.5'],
		['modified', '202.6', '202.3'],
	])
})
