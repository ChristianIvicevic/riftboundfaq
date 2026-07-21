import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'
import { submitBlockFeedback } from '@/actions/feedback'
import { Card } from '@/components/cards/card'
import { FeedbackBlock } from '@/components/feedback/client'

export function getMDXComponents(components?: MDXComponents): MDXComponents {
	return {
		...defaultMdxComponents,
		Card,
		Tiles: defaultMdxComponents.Cards,
		Tile: defaultMdxComponents.Card,
		FeedbackBlock: (props) => <FeedbackBlock {...props} onSendAction={submitBlockFeedback} />,
		...components,
	}
}
