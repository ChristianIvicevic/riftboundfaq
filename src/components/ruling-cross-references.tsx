import { Fragment } from 'react'
import type { ResolvedRulingCrossReference } from '@/lib/content/ruling-cross-references'

export function RulingCrossReferences({
	references,
}: {
	references: readonly ResolvedRulingCrossReference[]
}) {
	if (references.length === 0) return null

	return (
		<nav
			aria-label="Related rulings"
			className="mt-4 text-sm leading-relaxed [overflow-wrap:anywhere] text-fd-muted-foreground"
		>
			<span className="font-medium">See also:</span>{' '}
			{references.map((reference, index) => (
				<Fragment key={`${reference.type}-${reference.url}`}>
					{index > 0 && '; '}
					<a
						className="font-medium text-fd-primary underline decoration-fd-primary/40 underline-offset-4 hover:decoration-fd-primary"
						href={reference.url}
					>
						{reference.question}
					</a>
				</Fragment>
			))}
		</nav>
	)
}
