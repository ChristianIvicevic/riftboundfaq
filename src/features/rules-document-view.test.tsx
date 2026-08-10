import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { CoreRulesDocumentView } from '@/features/core-rules/document-view'
import { rulesDocuments } from '@/features/rules-documents/registry'
import { TournamentRulesDocumentView } from '@/features/tournament-rules/document-view'

describe('rules document view article semantics', () => {
	test('leaves Core Rules article semantics to the parent', () => {
		const html = renderToStaticMarkup(
			<CoreRulesDocumentView document={rulesDocuments.get({ type: 'core-rules', version: '1.0' })} />,
		)

		expect(html).toMatch(/^<div\b/u)
		expect(html).toContain('id="R000"')
	})

	test('leaves Tournament Rules article semantics to the parent', () => {
		const html = renderToStaticMarkup(
			<TournamentRulesDocumentView
				document={rulesDocuments.get({ type: 'tournament-rules', version: '2025-07-21' })}
			/>,
		)

		expect(html).toMatch(/^<div\b/u)
		expect(html).toContain('id="R100"')
	})
})
