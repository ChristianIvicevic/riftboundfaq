export type RulingRelationDefinition = {
	id: string
	anchor: string
	question: string
	appliesTo: readonly string[]
}

type RelationPage = {
	url: string
	path: string
	data: {
		title: string
		toc: readonly { url: string }[]
		rulingRelations?: readonly RulingRelationDefinition[]
	}
}

export type RulingPageReference = {
	title: string
	url: string
}

export type ResolvedRulingRelation = {
	id: string
	anchor: string
	question: string
	canonicalPage: RulingPageReference
	canonicalUrl: string
	participantPages: RulingPageReference[]
}

export type PageRulingRelations = {
	owned: ResolvedRulingRelation[]
	incoming: ResolvedRulingRelation[]
}

const EMPTY_RELATIONS: PageRulingRelations = { owned: [], incoming: [] }

export function buildRulingRelationIndex(pages: readonly RelationPage[]) {
	const pagesByUrl = new Map(pages.map((page) => [page.url, page]))
	const relationIds = new Set<string>()
	const index = new Map<string, PageRulingRelations>()

	const getPageRelations = (url: string) => {
		let relations = index.get(url)
		if (!relations) {
			relations = { owned: [], incoming: [] }
			index.set(url, relations)
		}
		return relations
	}

	for (const page of pages) {
		for (const relation of page.data.rulingRelations ?? []) {
			if (relationIds.has(relation.id))
				throw new Error(`Duplicate ruling relation ID "${relation.id}" in ${page.path}`)
			relationIds.add(relation.id)

			if (!page.data.toc.some((item) => item.url === `#${relation.anchor}`))
				throw new Error(
					`Ruling relation "${relation.id}" references missing anchor ${page.url}#${relation.anchor} in ${page.path}`,
				)

			const participantRoutes = new Set<string>()
			const participantPages = relation.appliesTo.map((route) => {
				if (route === page.url)
					throw new Error(`Ruling relation "${relation.id}" cannot reference its own page ${route}`)
				if (participantRoutes.has(route))
					throw new Error(`Ruling relation "${relation.id}" contains duplicate participant ${route}`)
				participantRoutes.add(route)

				const participant = pagesByUrl.get(route)
				if (!participant) throw new Error(`Ruling relation "${relation.id}" references missing page ${route}`)
				return { title: participant.data.title, url: participant.url }
			})

			participantPages.sort((a, b) => a.title.localeCompare(b.title))
			const resolved: ResolvedRulingRelation = {
				id: relation.id,
				anchor: relation.anchor,
				question: relation.question,
				canonicalPage: { title: page.data.title, url: page.url },
				canonicalUrl: `${page.url}#${relation.anchor}`,
				participantPages,
			}

			getPageRelations(page.url).owned.push(resolved)
			for (const participant of participantPages) getPageRelations(participant.url).incoming.push(resolved)
		}
	}

	for (const relations of index.values()) {
		relations.owned.sort((a, b) => a.question.localeCompare(b.question))
		relations.incoming.sort((a, b) => a.question.localeCompare(b.question))
	}

	return index
}

export function getRulingRelations(index: ReadonlyMap<string, PageRulingRelations>, pageUrl: string) {
	return index.get(pageUrl) ?? EMPTY_RELATIONS
}
