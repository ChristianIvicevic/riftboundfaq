import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'
import { submitBlockFeedback } from '@/app/(wiki)/[[...slug]]/actions'
import { FeedbackBlock } from '@/components/feedback/client'

export function getMDXComponents(components?: MDXComponents): MDXComponents {
	return {
		...defaultMdxComponents,
		FeedbackBlock: (props) => <FeedbackBlock {...props} onSendAction={submitBlockFeedback} />,
		...components,
	}
}
