import { afterEach, describe, expect, test, vi } from 'vitest'

afterEach(() => {
	vi.doUnmock('@/generated/core-rules')
	vi.doUnmock('@/generated/tournament-rules')
	vi.resetModules()
})

describe('rules documents registry invariants', () => {
	test('lazily rejects a registered document whose source sequence moves backwards', async () => {
		vi.doMock('@/generated/core-rules', () => ({
			CURRENT_PDF_CORE_RULES_VERSION: '1.0',
			PDF_CORE_RULES_VERSION_NAMES: {},
			PDF_CORE_RULES_VERSIONS: {
				'1.0': {
					schemaVersion: 3,
					version: '1.0',
					sections: [
						{
							heading: { sequence: 2, id: '100', text: 'Section' },
							preamble: [
								{
									sequence: 1,
									id: '101',
									content: [{ kind: 'paragraph', text: 'Rule' }],
									children: [],
								},
							],
							subsections: [],
						},
					],
				},
			},
		}))
		vi.doMock('@/generated/tournament-rules', () => ({
			CURRENT_PDF_TOURNAMENT_RULES_VERSION: '2026-01-01',
			PDF_TOURNAMENT_RULES_DOCUMENTS: {
				'2026-01-01': { schemaVersion: 1, version: '2026-01-01', sections: [] },
			},
		}))

		const { rulesDocuments, RulesDocumentInvariantError } =
			await import('@/features/rules-documents/registry')
		const family = rulesDocuments.family('core-rules')

		expect(family.registeredVersions).toHaveLength(1)
		expect(() => family.get('1.0')).toThrow(RulesDocumentInvariantError)
		expect(() => family.get('1.0')).toThrow('Core Rules 1.0 source row 1: source sequence follows 2')
	})
})
