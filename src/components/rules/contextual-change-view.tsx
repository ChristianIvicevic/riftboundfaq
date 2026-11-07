import type { ReactNode } from 'react'
import { RulesComparisonControls } from '@/components/rules/rules-comparison-controls'
import type { PreparedRulesChange } from '@/features/rules-documents/rules-change'

export function ContextualRulesChangeView({
	change,
	context,
}: {
	change: PreparedRulesChange
	context: ReactNode
}) {
	return (
		<div className="relative my-6 prose-no-margin" data-rules-comparison>
			<RulesComparisonControls change={change} />
			<div className="peer-data-[view=before-and-after]:hidden [&>.not-prose]:mt-0">{context}</div>
		</div>
	)
}
