import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { CoreRulesDocumentView } from '@/features/core-rules/document-view'
import { TournamentRulesDocumentView } from '@/features/tournament-rules/document-view'

describe('rules document view article semantics', () => {
	test('leaves Core Rules article semantics to the parent', () => {
		const html = renderToStaticMarkup(
			<CoreRulesDocumentView document={{ schemaVersion: 3, version: 'test', sections: [] }} />,
		)

		expect(html).toMatch(/^<div\b/u)
	})

	test('leaves Tournament Rules article semantics to the parent', () => {
		const html = renderToStaticMarkup(
			<TournamentRulesDocumentView document={{ schemaVersion: 1, version: 'test', sections: [] }} />,
		)

		expect(html).toMatch(/^<div\b/u)
	})
})
