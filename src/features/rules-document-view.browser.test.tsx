import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { CoreRulesDocumentView } from '@/features/core-rules/document-view'
import { rulesDocuments } from '@/features/rules-documents/registry'
import { TournamentRulesDocumentView } from '@/features/tournament-rules/document-view'

describe('rules document view article semantics', () => {
	test('leaves Core Rules article semantics to the parent', async () => {
		const screen = await render(
			<CoreRulesDocumentView document={rulesDocuments.get({ type: 'core-rules', version: '1.0' })} />,
		)

		expect(screen.getByRole('article').elements()).toHaveLength(0)
		await expect
			.element(screen.getByRole('heading', { level: 2, name: /^000\./u }))
			.toHaveAttribute('id', 'R000')
	})

	test('leaves Tournament Rules article semantics to the parent', async () => {
		const screen = await render(
			<TournamentRulesDocumentView
				document={rulesDocuments.get({ type: 'tournament-rules', version: '2025-07-21' })}
			/>,
		)

		expect(screen.getByRole('article').elements()).toHaveLength(0)
		await expect
			.element(screen.getByRole('heading', { level: 2, name: /^100\./u }))
			.toHaveAttribute('id', 'R100')
	})
})
