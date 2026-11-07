import { Step, Steps } from 'fumadocs-ui/components/steps'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'
import type { ComponentProps } from 'react'
import { AlphabeticalIndex } from '@/components/alphabetical-index'
import { Card } from '@/components/cards/card'
import { CardErratum, CardErratumText } from '@/components/cards/card-erratum'
import { Rule } from '@/components/core-rules/rule'
import { Del, Ins } from '@/components/diff-marks'
import { MDX_TERMS } from '@/components/game-terms'
import { Energy, Exhaust, Might, RUNES, Universal } from '@/components/resources'
import { Term } from '@/components/term'
import { renderRulesChange, type ResolvedRulesChangePage } from '@/features/rules-documents/change-route'
import type { CompiledRulesDocument } from '@/features/rules-documents/registry'
import {
	renderVersionedRulesDocument,
	type ResolvedRulesDocumentPage,
} from '@/features/rules-documents/versioned-route'

const wikiMdxComponents = {
	...defaultMdxComponents,
	// Preserve Fumadocs' card layout components before replacing `Card` below.
	Tiles: defaultMdxComponents.Cards,
	Tile: defaultMdxComponents.Card,
	Steps,
	Step,
	AlphabeticalIndex,
	Card,
	CardErratum,
	CardErratumText,
	Del,
	Ins,
	Energy,
	Exhaust,
	Might,
	Universal,
	Term,
	del: Del,
	ins: Ins,
	...RUNES,
	...MDX_TERMS,
} satisfies MDXComponents

export function getMDXComponents(
	relativeLink: NonNullable<MDXComponents['a']>,
	reviewedCoreRulesDocument?: CompiledRulesDocument,
	resolvedRulesDocumentPage?: ResolvedRulesDocumentPage,
	resolvedRulesChangePage?: ResolvedRulesChangePage,
): MDXComponents {
	return {
		...wikiMdxComponents,
		a: relativeLink,
		CoreRulesDiff: (props: { from: string; to: string }) =>
			renderRulesChange(resolvedRulesChangePage, { type: 'core-rules', ...props }),
		RulesDocument: () => renderVersionedRulesDocument(resolvedRulesDocumentPage),
		Rule: (props: Omit<ComponentProps<typeof Rule>, 'document'>) => (
			<Rule {...props} document={reviewedCoreRulesDocument} />
		),
		TournamentRulesDiff: (props: { from: string; to: string }) =>
			renderRulesChange(resolvedRulesChangePage, { type: 'tournament-rules', ...props }),
	}
}
