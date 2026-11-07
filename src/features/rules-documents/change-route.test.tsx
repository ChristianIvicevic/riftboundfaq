import { describe, expect, test } from 'vitest'
import {
	renderRulesChange,
	resolveRulesChangeRoute,
	RulesChangeRouteError,
} from '@/features/rules-documents/change-route'

describe('rules changes page route', () => {
	test('resolves contextual Core Rules headings for navigation and rendering', () => {
		const route = resolveRulesChangeRoute('/reference/core-rules/changes/1.4')

		expect(route).toMatchObject({ type: 'core-rules', from: '1.3', to: '1.4' })
		expect(route?.toc[0]).toEqual({
			title: '000. Golden and Silver Rules',
			url: '#new:R000',
			depth: 2,
		})
		expect(route?.toc).toContainEqual({ title: '050. Silver Rule', url: '#new:R050', depth: 3 })
	})

	test('resolves Tournament Rules changes through the same seam', () => {
		const route = resolveRulesChangeRoute('/reference/tournament-rules/changes/2026-03-30')

		expect(route).toMatchObject({
			type: 'tournament-rules',
			from: '2025-07-21',
			to: '2026-03-30',
		})
		expect(route?.toc[0]).toEqual({ title: '000. Golden Rule', url: '#new:R000', depth: 2 })
	})

	test('leaves non-change pages outside the seam', () => {
		expect(resolveRulesChangeRoute('/cards/alpha-strike')).toBeUndefined()
		expect(resolveRulesChangeRoute('/reference/core-rules/1.4')).toBeUndefined()
	})

	test('rejects rendering without matching route context', () => {
		expect(() => renderRulesChange(undefined, { type: 'core-rules', from: '1.3', to: '1.4' })).toThrow(
			expect.objectContaining<Partial<RulesChangeRouteError>>({
				reason: 'missing-route-context',
			}),
		)

		const route = resolveRulesChangeRoute('/reference/core-rules/changes/1.4')
		expect(() => renderRulesChange(route, { type: 'core-rules', from: '1.2', to: '1.3' })).toThrow(
			expect.objectContaining<Partial<RulesChangeRouteError>>({
				reason: 'route-mismatch',
				url: '/reference/core-rules/changes/1.4',
			}),
		)
	})
})
