import { describe, expect, test } from 'vitest'
import { getGlossaryEntry, GLOSSARY } from '@/lib/glossary'

describe('game glossary', () => {
	test('resolves the current game glossary entry for a registered key', () => {
		expect(getGlossaryEntry('finalization')).toEqual({
			title: 'Finalization',
			explanation:
				'Finalization is the setup stage of playing a card or ability: settle its required up-front choices and costs, then check that the play is legal. Once finalized, that setup is complete, but its effects have not necessarily happened yet; spells and most abilities still wait before taking effect.',
		})
	})

	test('contains the agreed initial vocabulary', () => {
		expect(Object.keys(GLOSSARY)).toEqual([
			'chain',
			'pending',
			'finalization',
			'resolution',
			'priority',
			'cleanup',
			'focus',
		])
	})

	test('rejects an unknown game glossary key', () => {
		expect(() => getGlossaryEntry('finalisation')).toThrow('Unknown game glossary key "finalisation"')
	})
})
