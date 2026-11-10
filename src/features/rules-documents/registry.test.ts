import { describe, expect, test } from 'vitest'
import {
	rulesDocuments,
	type CompiledRulesDocument,
	type RuleChangeMarker,
	type TraversedRule,
	UnknownRulesVersionError,
} from '@/features/rules-documents/registry'

function collectChangeMarkers(
	rules: readonly TraversedRule[],
): readonly (readonly [string, RuleChangeMarker])[] {
	return rules.flatMap((rule) => [
		...(rule.changeMarker ? ([[rule.anchor, rule.changeMarker]] as const) : []),
		...collectChangeMarkers(rule.children),
	])
}

function compareChangeMarkersByAnchor(
	[left]: readonly [string, RuleChangeMarker],
	[right]: readonly [string, RuleChangeMarker],
) {
	return left.localeCompare(right)
}

function collectDocumentChangeMarkers(
	document: CompiledRulesDocument,
): (readonly [string, RuleChangeMarker])[] {
	const markers: (readonly [string, RuleChangeMarker])[] = []
	for (const { heading, blocks } of document.sections) {
		if (heading.changeMarker) markers.push([heading.anchor, heading.changeMarker])
		for (const block of blocks) {
			if (block.kind === 'subsection' && block.heading.changeMarker) {
				markers.push([block.heading.anchor, block.heading.changeMarker])
			}
			markers.push(...collectChangeMarkers(block.rules))
		}
	}
	return markers
}

describe('rules documents registry', () => {
	test('shares registered identities with exact compiled rules versions', () => {
		const coreRules = rulesDocuments.family('core-rules')
		const current = coreRules.registeredVersions.find(({ status }) => status === 'current')!
		const archived = coreRules.registeredVersions.find(({ status }) => status === 'archived')!

		expect(coreRules.registeredVersions.filter(({ status }) => status === 'current')).toHaveLength(1)
		expect(coreRules.currentVersion).toBe(current)
		expect(coreRules.current.identity).toBe(current)
		expect(coreRules.current.identity.version).not.toBe('current')
		expect(rulesDocuments.get({ type: 'core-rules', version: archived.version }).identity).toBe(archived)
		expect(rulesDocuments.find({ type: 'core-rules', version: '9.9' })).toBeUndefined()
		expect(() => rulesDocuments.get({ type: 'core-rules', version: '9.9' })).toThrow(
			'Unknown Core Rules version "9.9"',
		)
		expect(() => rulesDocuments.get({ type: 'core-rules', version: '9.9' })).toThrow(UnknownRulesVersionError)
	})

	test('derives Core Rules hierarchy, navigation, duplicate anchors, lookup, and diff records together', () => {
		const document = rulesDocuments.get({ type: 'core-rules', version: '1.1' })
		const gearHeading = document.navigation.find(({ id }) => id === '143')
		const gearRecords = document.diffRecords.filter(({ id }) => id === '143')

		expect(document.navigation[0]).toBe(document.sections[0].heading)
		expect(document.sections[0].heading).toMatchObject({ id: '000', anchor: 'R000', depth: 2 })
		expect(gearHeading).toMatchObject({ text: 'Gear', anchor: 'R143', depth: 3 })
		expect(gearRecords).toEqual([
			{
				id: '143',
				content: [{ kind: 'paragraph', text: 'Gear' }],
				anchor: 'R143',
				parentAnchor: 'R100',
				kind: 'heading',
				headingDepth: 3,
			},
			{
				id: '143',
				content: [{ kind: 'paragraph', text: 'Gear are:' }],
				anchor: 'R143-2',
				parentAnchor: 'R143',
				kind: 'rule',
			},
		])
		expect(document.referenceTarget('143')).toEqual({ id: '143', anchor: 'R143' })
		expect(document.lookupText('143')).toBe('Gear')
	})

	test('preserves later duplicate Core Rules anchors', () => {
		const document = rulesDocuments.get({ type: 'core-rules', version: '1.2' })

		expect(document.diffRecords.filter(({ id }) => id === '744.5')).toMatchObject([
			{ anchor: 'R744.5' },
			{ anchor: 'R744.5-2' },
		])
		expect(document.referenceTarget('744.5')).toEqual({ id: '744.5', anchor: 'R744.5' })
	})

	test('preserves Tournament Rules block order and unnumbered entries', () => {
		const family = rulesDocuments.family('tournament-rules')
		const document = family.get('2026-03-30')
		const unnumbered = document.diffRecords.find(({ anchor }) => anchor === 'U474')

		expect(family.current.identity.status).toBe('current')
		expect(document.navigation[0]).toBe(document.sections[0].heading)
		expect(unnumbered).toEqual({
			id: null,
			content: [
				{
					kind: 'paragraph',
					text: 'Players may utilize as many “blank” battlefields as they need for limited gameplay. See 602.3.d. below for more information on “blank” battlefields.',
				},
			],
			anchor: 'U474',
			parentAnchor: 'R602.1.a',
			kind: 'rule',
		})
		expect(document.referenceTarget('701')).toMatchObject({ id: '701', anchor: 'R701' })
	})

	test('compiles every registered rules version through the public interface', () => {
		for (const type of ['core-rules', 'tournament-rules'] as const) {
			const family = rulesDocuments.family(type)
			for (const { version } of family.registeredVersions) {
				expect(family.get(version).identity.version).toBe(version)
			}
		}
	})

	test('gives each target rules page the same change badges as its changes page', () => {
		for (const type of ['core-rules', 'tournament-rules'] as const) {
			const family = rulesDocuments.family(type)
			const versions = family.registeredVersions.map(({ version }) => version)
			for (let index = 1; index < versions.length; index++) {
				const from = versions[index - 1]!
				const to = versions[index]!
				const expected: (readonly [string, RuleChangeMarker])[] = []
				for (const entry of family.compare(from, to).entries) {
					if (entry.kind === 'added') {
						expected.push([entry.rule.anchor, 'new'])
					}
					if (entry.kind === 'modified') {
						expected.push([entry.newRule.anchor, 'changed'])
					}
				}
				const actual = collectDocumentChangeMarkers(family.get(to))

				expect(actual.toSorted(compareChangeMarkersByAnchor), `${type} ${from} -> ${to}`).toEqual(
					expected.toSorted(compareChangeMarkersByAnchor),
				)
			}
		}
	})

	test('memoizes documents and keeps immutable rendered headings in navigation', () => {
		const family = rulesDocuments.family('core-rules')
		const document = family.get('1.0')
		const renderedHeadings = document.sections.flatMap((section) => [
			section.heading,
			...section.blocks.flatMap((block) => (block.kind === 'subsection' ? [block.heading] : [])),
		])

		expect(family.get('1.0')).toBe(document)
		expect(document.navigation).toHaveLength(renderedHeadings.length)
		document.navigation.forEach((heading, index) => expect(heading).toBe(renderedHeadings[index]))
		const heading = document.sections[0].heading
		const originalText = heading.text
		expect(Reflect.set(heading, 'text', 'Changed heading')).toBe(false)
		expect(heading.text).toBe(originalText)
	})
})
