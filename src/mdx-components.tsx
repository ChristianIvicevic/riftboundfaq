import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'
import { submitBlockFeedback } from '@/actions/feedback'
import { Card } from '@/components/cards/card'
import { CoreRulesDiff } from '@/components/core-rules/diff-view'
import { Rule } from '@/components/core-rules/rule'
import { CoreRulesTable } from '@/components/core-rules/table'
import { FeedbackBlock } from '@/components/feedback/client'
import { KEYWORDS } from '@/components/keywords'
import { Energy, RUNES, Universal } from '@/components/resources'
import { TournamentRulesDiff } from '@/components/tournament-rules/diff-view'
import { TournamentRulesTable } from '@/components/tournament-rules/table'

const wikiMdxComponents = {
	...defaultMdxComponents,
	// Preserve Fumadocs' card layout components before replacing `Card` below.
	Tiles: defaultMdxComponents.Cards,
	Tile: defaultMdxComponents.Card,
	Card,
	Rule,
	CoreRulesTable,
	CoreRulesDiff,
	TournamentRulesTable,
	TournamentRulesDiff,
	Energy,
	Universal,
	...RUNES,
	...KEYWORDS,
	FeedbackBlock: (props) => <FeedbackBlock {...props} onSendAction={submitBlockFeedback} />,
} satisfies MDXComponents

export function getMDXComponents(a: NonNullable<MDXComponents['a']>): MDXComponents {
	return {
		...wikiMdxComponents,
		a,
	}
}
