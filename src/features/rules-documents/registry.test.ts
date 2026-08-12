import { describe, expect, test } from 'vitest'
import { rulesDocuments, UnknownRulesVersionError } from '@/features/rules-documents/registry'

describe('rules documents registry', () => {
	test('distinguishes exact registered versions from the current rules version', () => {
		const coreRules = rulesDocuments.family('core-rules')
		const current = coreRules.registeredVersions.find(({ status }) => status === 'current')!
		const archived = coreRules.registeredVersions.find(({ status }) => status === 'archived')!

		expect(coreRules.registeredVersions.filter(({ status }) => status === 'current')).toHaveLength(1)
		expect(coreRules.currentVersion).toBe(current)
		expect(coreRules.currentTransition?.from).toMatchObject({ version: '1.3', status: 'archived' })
		expect(coreRules.currentTransition?.to).toBe(current)
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
			{ id: '143', lines: ['Gear'], anchor: 'R143', label: '143.' },
			{ id: '143', lines: ['Gear are:'], anchor: 'R143-2', label: '143.' },
		])
		expect(document.referenceTarget('143')).toEqual({ id: '143', anchor: 'R143' })
		expect(document.lookupText('143')).toBe('Gear')
	})

	test('preserves later duplicate Core Rules anchors', () => {
		const document = rulesDocuments.get({ type: 'core-rules', version: '1.2' })

		expect(document.diffRecords.filter(({ id }) => id === '744.5')).toMatchObject([
			{ anchor: 'R744.5', label: '744.5.' },
			{ anchor: 'R744.5-2', label: '744.5.' },
		])
		expect(document.referenceTarget('744.5')).toEqual({ id: '744.5', anchor: 'R744.5' })
	})

	test('preserves Tournament Rules block order, source labels, and unnumbered diff identities', () => {
		const family = rulesDocuments.family('tournament-rules')
		const document = family.get('2026-03-30')
		const unnumbered = document.diffRecords.find(({ id }) => id === 'unnumbered::1')

		expect(family.current.identity.status).toBe('current')
		expect(document.navigation[0]).toBe(document.sections[0].heading)
		expect(unnumbered).toEqual({
			id: 'unnumbered::1',
			lines: [
				'Players may utilize as many “blank” battlefields as they need for limited gameplay. See 602.3.d. below for more information on “blank” battlefields.',
			],
			anchor: 'U474',
			label: 'Unnumbered',
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

	test('memoizes immutable documents whose navigation headings are the rendered headings', () => {
		const family = rulesDocuments.family('core-rules')
		const document = family.get('1.0')
		const renderedHeadings = document.sections.flatMap((section) => [
			section.heading,
			...section.blocks.flatMap((block) => (block.kind === 'subsection' ? [block.heading] : [])),
		])

		expect(family.get('1.0')).toBe(document)
		expect(document.navigation).toHaveLength(renderedHeadings.length)
		document.navigation.forEach((heading, index) => expect(heading).toBe(renderedHeadings[index]))
		expect(Object.isFrozen(document)).toBe(true)
		expect(Object.isFrozen(document.identity)).toBe(true)
		expect(Object.isFrozen(document.sections)).toBe(true)
		expect(Object.isFrozen(document.sections[0].heading)).toBe(true)
		expect(Object.isFrozen(document.sections[0].blocks)).toBe(true)
	})
})
