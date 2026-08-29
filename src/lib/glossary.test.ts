import { describe, expect, test } from 'vitest'
import { getGlossaryEntry, GLOSSARY } from '@/lib/glossary'

describe('Glossary', () => {
	test('resolves the current Glossary entry for a registered item', () => {
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

	test('rejects an unknown Glossary item', () => {
		expect(() => getGlossaryEntry('finalisation')).toThrow('Unknown Glossary item "finalisation"')
	})
})
