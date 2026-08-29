import { Step, Steps } from 'fumadocs-ui/components/steps'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'
import type { ComponentProps } from 'react'
import { Card } from '@/components/cards/card'
import { Rule } from '@/components/core-rules/rule'
import { MDX_TERMS } from '@/components/game-terms'
import { Energy, RUNES, Universal } from '@/components/resources'
import { CoreRulesDiff, TournamentRulesDiff } from '@/components/rules/change-view'
import { Term } from '@/components/term'
import type { TraversedRulesDocument } from '@/features/rules-documents/registry'
import {
	renderVersionedRulesDocument,
	type VersionedRulesRoute,
} from '@/features/rules-documents/versioned-route'

const wikiMdxComponents = {
	...defaultMdxComponents,
	// Preserve Fumadocs' card layout components before replacing `Card` below.
	Tiles: defaultMdxComponents.Cards,
	Tile: defaultMdxComponents.Card,
	Steps,
	Step,
	Card,
	CoreRulesDiff,
	TournamentRulesDiff,
	Energy,
	Universal,
	Term,
	...RUNES,
	...MDX_TERMS,
} satisfies MDXComponents

export function getMDXComponents(
	relativeLink: NonNullable<MDXComponents['a']>,
	reviewedCoreRulesDocument?: TraversedRulesDocument,
	versionedRulesRoute?: VersionedRulesRoute,
): MDXComponents {
	return {
		...wikiMdxComponents,
		a: relativeLink,
		RulesDocument: () => renderVersionedRulesDocument(versionedRulesRoute),
		Rule: (props: Omit<ComponentProps<typeof Rule>, 'document'>) => (
			<Rule {...props} document={reviewedCoreRulesDocument} />
		),
	}
}
