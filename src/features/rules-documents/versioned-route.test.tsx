import { describe, expect, test } from 'vitest'
import {
	resolveVersionedRulesRoute,
	VersionedRulesRouteError,
} from '@/features/rules-documents/versioned-route'

describe('Versioned rules route', () => {
	test('resolves one archived rules document for navigation and rendering', () => {
		const route = resolveVersionedRulesRoute({
			url: '/reference/core-rules/1.0',
			rulesDocument: { type: 'core-rules', version: '1.0' },
		})

		expect(route?.document.identity).toMatchObject({
			type: 'core-rules',
			version: '1.0',
			status: 'archived',
		})
		expect(route?.toc[0]).toEqual({ title: '000. Golden and Silver Rules', url: '#R000', depth: 2 })
	})

	test('renders the Current Tournament Rules through its family adapter', () => {
		const route = resolveVersionedRulesRoute({
			url: '/reference/tournament-rules/2026-07-16',
			rulesDocument: { type: 'tournament-rules', version: '2026-07-16' },
		})

		expect(route?.document.identity.status).toBe('current')
	})

	test('leaves pages without a rules document outside the seam', () => {
		expect(resolveVersionedRulesRoute({ url: '/cards/alpha-strike' })).toBeUndefined()
		expect(resolveVersionedRulesRoute({ url: '/reference/core-rules/changes/1.4' })).toBeUndefined()
	})

	test('rejects a rules document at the wrong route', () => {
		expect(() =>
			resolveVersionedRulesRoute({
				url: '/reference/core-rules/1.1',
				rulesDocument: { type: 'core-rules', version: '1.0' },
			}),
		).toThrow(
			expect.objectContaining<Partial<VersionedRulesRouteError>>({
				reason: 'route-mismatch',
				url: '/reference/core-rules/1.1',
			}),
		)
	})

	test('rejects an unregistered rules version without falling back', () => {
		expect(() =>
			resolveVersionedRulesRoute({
				url: '/reference/core-rules/1.99',
				rulesDocument: { type: 'core-rules', version: '1.99' },
			}),
		).toThrow(
			expect.objectContaining<Partial<VersionedRulesRouteError>>({
				reason: 'unknown-rules-version',
				url: '/reference/core-rules/1.99',
			}),
		)
	})

	test('reports an invalid version as unknown instead of leaking convention validation', () => {
		expect(() =>
			resolveVersionedRulesRoute({
				url: '/reference/core-rules/bogus',
				rulesDocument: { type: 'core-rules', version: 'bogus' },
			}),
		).toThrow(
			expect.objectContaining<Partial<VersionedRulesRouteError>>({
				reason: 'unknown-rules-version',
				url: '/reference/core-rules/bogus',
			}),
		)
	})
})
