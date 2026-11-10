import { describe, expect, test } from 'vitest'
import {
	renderVersionedRulesDocument,
	resolveVersionedRulesRoute,
	VersionedRulesRouteError,
} from '@/features/rules-documents/versioned-route'

describe('version-specific rules page', () => {
	test('resolves one archived rules document for navigation and rendering', () => {
		const route = resolveVersionedRulesRoute({
			url: '/rules-documents/core-rules/1.0',
			rulesDocument: { type: 'core-rules', version: '1.0' },
		})

		expect(route?.document.identity).toMatchObject({
			type: 'core-rules',
			version: '1.0',
			status: 'archived',
		})
		expect(route?.toc[0]).toEqual({ title: '000. Golden and Silver Rules', url: '#R000', depth: 2 })
	})

	test('leaves unrelated pages unresolved and rejects rendering without page context', () => {
		const route = resolveVersionedRulesRoute({ url: '/rulings/cards/alpha-strike' })

		expect(route).toBeUndefined()
		expect(() => renderVersionedRulesDocument(route)).toThrow(
			expect.objectContaining<Partial<VersionedRulesRouteError>>({
				reason: 'missing-route-context',
			}),
		)
	})

	test('rejects a rules document at the wrong URL', () => {
		expect(() =>
			resolveVersionedRulesRoute({
				url: '/rules-documents/core-rules/1.1',
				rulesDocument: { type: 'core-rules', version: '1.0' },
			}),
		).toThrow(
			expect.objectContaining<Partial<VersionedRulesRouteError>>({
				reason: 'route-mismatch',
				url: '/rules-documents/core-rules/1.1',
			}),
		)
	})

	test('rejects an unregistered rules version without falling back', () => {
		expect(() =>
			resolveVersionedRulesRoute({
				url: '/rules-documents/core-rules/1.99',
				rulesDocument: { type: 'core-rules', version: '1.99' },
			}),
		).toThrow(
			expect.objectContaining<Partial<VersionedRulesRouteError>>({
				reason: 'unknown-rules-version',
				url: '/rules-documents/core-rules/1.99',
			}),
		)
	})

	test('reports an invalid version as unknown instead of leaking convention validation', () => {
		expect(() =>
			resolveVersionedRulesRoute({
				url: '/rules-documents/core-rules/bogus',
				rulesDocument: { type: 'core-rules', version: 'bogus' },
			}),
		).toThrow(
			expect.objectContaining<Partial<VersionedRulesRouteError>>({
				reason: 'unknown-rules-version',
				url: '/rules-documents/core-rules/bogus',
			}),
		)
	})
})
