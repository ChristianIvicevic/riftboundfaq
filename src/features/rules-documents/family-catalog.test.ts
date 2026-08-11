import { describe, expect, test, vi } from 'vitest'
import {
	createRulesDocumentFamilyCatalog,
	RulesDocumentInvariantError,
	UnknownRulesVersionError,
} from '@/features/rules-documents/family-catalog'

const diffId = (id: string | null) => id ?? 'unnumbered'

function emptySource(version: string) {
	return { version, sections: [] }
}

const invalidCatalogs: readonly {
	name: string
	currentVersion: string
	documents: Record<string, { version: string }>
	message: string
}[] = [
	{
		name: 'has no Registered rules versions',
		currentVersion: '1.0',
		documents: {},
		message: 'Core Rules 1.0: no registered rules versions',
	},
	{
		name: 'does not register the Current rules version',
		currentVersion: '1.1',
		documents: { '1.0': { version: '1.0' } },
		message: 'Core Rules 1.1: current rules version is not registered',
	},
	{
		name: 'declares a non-greatest Current rules version',
		currentVersion: '1.0',
		documents: { '1.0': { version: '1.0' }, '1.1': { version: '1.1' } },
		message: 'Core Rules 1.0: current rules version is not the greatest registered rules version "1.1"',
	},
]

describe('Rules document family catalog', () => {
	test('orders Registered rules versions and identifies the transition into the Current rules version', () => {
		const adapt = vi.fn(({ version }: { version: string }) => ({ version, sections: [] }))
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.10',
			documents: {
				'1.10': { version: '1.10' },
				'1.2': { version: '1.2' },
				'1.9': { version: '1.9' },
			},
			adapt,
			diffId,
		})

		expect(catalog.registeredVersions).toEqual([
			{ type: 'core-rules', version: '1.2', name: null, status: 'archived' },
			{ type: 'core-rules', version: '1.9', name: null, status: 'archived' },
			{ type: 'core-rules', version: '1.10', name: null, status: 'current' },
		])
		expect(catalog.currentTransition).toEqual({
			from: catalog.registeredVersions[1],
			to: catalog.registeredVersions[2],
		})
		expect(adapt).not.toHaveBeenCalled()
	})

	test('orders Tournament Rules versions and permits a family with no Archived rules version', () => {
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'tournament-rules',
			currentVersion: '2026-07-16',
			documents: {
				'2026-07-16': { version: '2026-07-16' },
				'2026-03-30': { version: '2026-03-30' },
				'2026-04-29': { version: '2026-04-29' },
			},
			adapt: ({ version }) => emptySource(version),
			diffId,
		})
		const firstCatalog = createRulesDocumentFamilyCatalog({
			type: 'tournament-rules',
			currentVersion: '2026-03-30',
			documents: { '2026-03-30': { version: '2026-03-30' } },
			adapt: ({ version }) => emptySource(version),
			diffId,
		})

		expect(catalog.registeredVersions.map(({ version }) => version)).toEqual([
			'2026-03-30',
			'2026-04-29',
			'2026-07-16',
		])
		expect(firstCatalog.currentTransition).toBeUndefined()
		expect(firstCatalog.current.identity.status).toBe('current')
	})

	test.each(invalidCatalogs)(
		'eagerly rejects a catalog that $name',
		({ currentVersion, documents, message }) => {
			expect(() =>
				createRulesDocumentFamilyCatalog({
					type: 'core-rules',
					currentVersion,
					documents,
					adapt: ({ version }) => emptySource(version),
					diffId,
				}),
			).toThrow(message)
		},
	)

	test('reports an invalid registered key as a catalog invariant', () => {
		let error: unknown
		try {
			createRulesDocumentFamilyCatalog({
				type: 'core-rules',
				currentVersion: '1.0',
				documents: { bogus: { version: 'bogus' } },
				adapt: ({ version }) => emptySource(version),
				diffId,
			})
		} catch (cause) {
			error = cause
		}

		expect(error).toBeInstanceOf(RulesDocumentInvariantError)
		expect(error).toMatchObject({
			message: 'Core Rules bogus: invalid registered rules version',
			cause: expect.any(Error),
		})
	})

	test('snapshots registration and compiles exact lookups lazily once', () => {
		const documents: Record<string, { version: string }> = {
			'1.0': { version: '1.0' },
			'1.1': { version: '1.1' },
		}
		const adapt = vi.fn(({ version }: { version: string }) => emptySource(version))
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.1',
			documents,
			adapt,
			diffId,
		})
		delete documents['1.0']
		documents['1.2'] = { version: '1.2' }

		expect(catalog.registeredVersions.map(({ version }) => version)).toEqual(['1.0', '1.1'])
		expect(catalog.get('1.0')).toBe(catalog.find('1.0'))
		expect(catalog.current).toBe(catalog.current)
		expect(adapt).toHaveBeenCalledTimes(2)
		expect(catalog.find('1.2')).toBeUndefined()
		expect(() => catalog.get('1.2')).toThrow(UnknownRulesVersionError)
		expect(Object.isFrozen(catalog)).toBe(true)
		expect(Object.isFrozen(catalog.registeredVersions)).toBe(true)
		expect(Object.isFrozen(catalog.currentTransition)).toBe(true)
	})

	test('reports source invariants lazily through the catalog interface', () => {
		const catalog = createRulesDocumentFamilyCatalog({
			type: 'core-rules',
			currentVersion: '1.0',
			documents: { '1.0': { version: '1.0' } },
			adapt: ({ version }) => ({
				version,
				sections: [
					{
						heading: { sequence: 2, id: '100', text: 'Section', label: '100.', depth: 2 },
						blocks: [
							{
								kind: 'rules',
								rules: [
									{
										sequence: 1,
										id: '101',
										label: '101.',
										diffLabel: '101.',
										content: [{ kind: 'paragraph', text: 'Rule' }],
										children: [],
									},
								],
							},
						],
					},
				],
			}),
			diffId,
		})

		expect(catalog.registeredVersions).toHaveLength(1)
		expect(() => catalog.get('1.0')).toThrow(RulesDocumentInvariantError)
		expect(() => catalog.get('1.0')).toThrow('Core Rules 1.0 source row 1: source sequence follows 2')
	})
})
