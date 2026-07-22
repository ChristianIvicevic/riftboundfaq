import { Card, Cards } from 'fumadocs-ui/components/card'
import type { PageRulingRelations } from '@/lib/ruling-relations'

export function RelatedRulings({ relations }: { relations: PageRulingRelations }) {
	if (relations.owned.length === 0 && relations.incoming.length === 0) return null

	return (
		<section aria-labelledby="related-rulings-heading" className="mt-2 border-t pt-6">
			<h2 id="related-rulings-heading" className="mb-4 text-xl font-semibold tracking-tight">
				Related rulings
			</h2>
			<Cards>
				{relations.incoming.map((relation) => (
					<Card
						key={`incoming-${relation.canonicalUrl}`}
						href={relation.canonicalUrl}
						title={relation.question}
						description={`Canonical ruling on ${relation.canonicalTitle}`}
					/>
				))}
				{relations.owned.flatMap((relation) =>
					relation.participantPages.map((participant) => (
						<Card
							key={`owned-${relation.canonicalUrl}-${participant.url}`}
							href={participant.url}
							title={participant.title}
							description={`Relevant to: ${relation.question}`}
						/>
					)),
				)}
			</Cards>
		</section>
	)
}
