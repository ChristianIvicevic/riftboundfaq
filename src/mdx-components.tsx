import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'
import { submitBlockFeedback } from '@/actions/feedback'
import { FeedbackBlock } from '@/components/feedback/client'
import { Card } from '@/components/cards/card'

export function getMDXComponents(components?: MDXComponents): MDXComponents {
	return {
		...defaultMdxComponents,
		Card,
		FeedbackBlock: (props) => <FeedbackBlock {...props} onSendAction={submitBlockFeedback} />,
		...components,
	}
}
