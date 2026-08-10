import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'
import type { ComponentProps } from 'react'
import { Card } from '@/components/cards/card'
import { CoreRulesDiff } from '@/components/core-rules/diff-view'
import { Rule } from '@/components/core-rules/rule'
import { MDX_TERMS } from '@/components/game-terms'
import { Energy, RUNES, Universal } from '@/components/resources'
import { TournamentRulesDiff } from '@/components/tournament-rules/diff-view'
import { CoreRulesDocumentView } from '@/features/core-rules/document-view'
import { submitBlockFeedback } from '@/features/feedback/actions'
import { FeedbackBlock } from '@/features/feedback/feedback'
import { rulesDocuments, type TraversedRulesDocument } from '@/features/rules-documents/registry'
import { TournamentRulesDocumentView } from '@/features/tournament-rules/document-view'

const wikiMdxComponents = {
	...defaultMdxComponents,
	// Preserve Fumadocs' card layout components before replacing `Card` below.
	Tiles: defaultMdxComponents.Cards,
	Tile: defaultMdxComponents.Card,
	Card,
	CoreRulesDiff,
	TournamentRulesDiff,
	Energy,
	Universal,
	...RUNES,
	...MDX_TERMS,
	FeedbackBlock: (props) => <FeedbackBlock {...props} onSendAction={submitBlockFeedback} />,
} satisfies MDXComponents

export function getMDXComponents(
	relativeLink: NonNullable<MDXComponents['a']>,
	reviewedCoreRulesVersion?: string,
	rulesDocument?: TraversedRulesDocument,
): MDXComponents {
	return {
		...wikiMdxComponents,
		a: relativeLink,
		CoreRulesDocument: () => (
			<CoreRulesDocumentView
				document={
					rulesDocument?.identity.type === 'core-rules'
						? rulesDocument
						: rulesDocuments.family('core-rules').current
				}
			/>
		),
		TournamentRulesDocument: () => (
			<TournamentRulesDocumentView
				document={
					rulesDocument?.identity.type === 'tournament-rules'
						? rulesDocument
						: rulesDocuments.family('tournament-rules').current
				}
			/>
		),
		Rule: (props: Omit<ComponentProps<typeof Rule>, 'coreRulesVersion'>) => (
			<Rule {...props} coreRulesVersion={reviewedCoreRulesVersion} />
		),
	}
}
