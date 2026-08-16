import { describe, expect, test } from 'vitest'
import { getGameTermComponentByLabel, MDX_TERMS } from '@/components/game-terms'

describe('getGameTermComponentByLabel', () => {
	test('resolves game terms by their displayed label', () => {
		expect(getGameTermComponentByLabel('Ambush')).toBe(MDX_TERMS.Ambush)
		expect(getGameTermComponentByLabel('Quick-Draw')).toBe(MDX_TERMS.QuickDraw)
	})

	test('leaves non-keyword mechanic categories unresolved', () => {
		expect(getGameTermComponentByLabel('Equipment')).toBeUndefined()
	})
})
