import { describe, expect, test } from 'vitest'
import { getGameTermComponentByLabel, MDX_TERMS, resolveGameTermToken } from '@/components/game-terms'

describe('getGameTermComponentByLabel', () => {
	test('resolves game terms by their displayed label', () => {
		expect(getGameTermComponentByLabel('Ambush')).toBe(MDX_TERMS.Ambush)
		expect(getGameTermComponentByLabel('Buff')).toBe(MDX_TERMS.Buff)
		expect(getGameTermComponentByLabel('Ganking')).toBe(MDX_TERMS.Ganking)
		expect(getGameTermComponentByLabel('Quick-Draw')).toBe(MDX_TERMS.QuickDraw)
		expect(getGameTermComponentByLabel('Tank')).toBe(MDX_TERMS.Tank)
		expect(getGameTermComponentByLabel('Vision')).toBe(MDX_TERMS.Vision)
	})

	test('leaves non-keyword mechanic categories unresolved', () => {
		expect(getGameTermComponentByLabel('Equipment')).toBeUndefined()
	})

	test('resolves valued dependent keywords from card-text notation', () => {
		expect(resolveGameTermToken('Level 6')).toEqual({ Component: MDX_TERMS.Level, value: '6' })
	})
})
