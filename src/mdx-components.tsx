import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'
import type { ComponentProps } from 'react'
import { Card } from '@/components/cards/card'
import { CoreRulesDiff } from '@/components/core-rules/diff-view'
import { Rule } from '@/components/core-rules/rule'
import { CoreRulesTable } from '@/components/core-rules/table'
import { MDX_TERMS } from '@/components/game-terms'
import { Energy, RUNES, Universal } from '@/components/resources'
import { TournamentRulesDiff } from '@/components/tournament-rules/diff-view'
import { TournamentRulesTable } from '@/components/tournament-rules/table'
import { submitBlockFeedback } from '@/features/feedback/actions'
import { FeedbackBlock } from '@/features/feedback/feedback'

const wikiMdxComponents = {
	...defaultMdxComponents,
	// Preserve Fumadocs' card layout components before replacing `Card` below.
	Tiles: defaultMdxComponents.Cards,
	Tile: defaultMdxComponents.Card,
	Card,
	CoreRulesTable,
	CoreRulesDiff,
	TournamentRulesTable,
	TournamentRulesDiff,
	Energy,
	Universal,
	...RUNES,
	...MDX_TERMS,
	FeedbackBlock: (props) => <FeedbackBlock {...props} onSendAction={submitBlockFeedback} />,
} satisfies MDXComponents

export function getMDXComponents(a: NonNullable<MDXComponents['a']>, crdVersion?: string): MDXComponents {
	return {
		...wikiMdxComponents,
		a,
		Rule: (props: Omit<ComponentProps<typeof Rule>, 'crdVersion'>) => (
			<Rule {...props} crdVersion={crdVersion} />
		),
	}
}
