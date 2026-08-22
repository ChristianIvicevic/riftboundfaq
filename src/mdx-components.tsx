import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'
import type { ComponentProps } from 'react'
import { Card } from '@/components/cards/card'
import { Rule } from '@/components/core-rules/rule'
import { MDX_TERMS } from '@/components/game-terms'
import { Energy, RUNES, Universal } from '@/components/resources'
import { CoreRulesDiff, TournamentRulesDiff } from '@/components/rules/change-view'
import { RulingCrossReferences } from '@/components/ruling-cross-references'
import { submitBlockFeedback } from '@/features/feedback/actions'
import { FeedbackBlock } from '@/features/feedback/feedback'
import type { TraversedRulesDocument } from '@/features/rules-documents/registry'
import {
	renderVersionedRulesDocument,
	type VersionedRulesRoute,
} from '@/features/rules-documents/versioned-route'
import type { ResolvedRulingCrossReference } from '@/lib/content/ruling-cross-references'

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
	reviewedCoreRulesDocument?: TraversedRulesDocument,
	versionedRulesRoute?: VersionedRulesRoute,
	resolveRulingCrossReferences?: (anchor: string) => readonly ResolvedRulingCrossReference[],
): MDXComponents {
	return {
		...wikiMdxComponents,
		a: relativeLink,
		RulingCrossReferences: ({ anchor }: { anchor: string }) => (
			<RulingCrossReferences references={resolveRulingCrossReferences?.(anchor) ?? []} />
		),
		RulesDocument: () => renderVersionedRulesDocument(versionedRulesRoute),
		Rule: (props: Omit<ComponentProps<typeof Rule>, 'document'>) => (
			<Rule {...props} document={reviewedCoreRulesDocument} />
		),
	}
}
