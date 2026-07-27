import type { RulingRelationDefinitions } from './ruling-relations-schema'

type RelationPage = {
	url: string
	path: string
	data: {
		title: string
		toc: readonly { url: string }[]
		structuredData: {
			headings: readonly { id: string; content: unknown }[]
		}
		rulingRelations?: RulingRelationDefinitions
	}
}

export type RulingPageReference = {
	title: string
	url: string
}

export type ResolvedRulingRelation = {
	question: string
	canonicalTitle: string
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
		for (const [anchor, participantRoutes] of Object.entries(page.data.rulingRelations ?? {})) {
			const canonicalUrl = `${page.url}#${anchor}`
			if (!page.data.toc.some((item) => item.url === `#${anchor}`))
				throw new Error(`Ruling relation references missing anchor ${canonicalUrl} in ${page.path}`)

			const heading = page.data.structuredData.headings.find((item) => item.id === anchor)
			if (!heading || typeof heading.content !== 'string' || heading.content.trim() === '')
				throw new Error(
					`Ruling relation heading ${canonicalUrl} must have a plain-text title in ${page.path}`,
				)

			const seenParticipantRoutes = new Set<string>()
			const participantPages = participantRoutes.map((route) => {
				if (route === page.url)
					throw new Error(`Ruling relation ${canonicalUrl} cannot reference its own page ${route}`)
				if (seenParticipantRoutes.has(route))
					throw new Error(`Ruling relation ${canonicalUrl} contains duplicate participant ${route}`)
				seenParticipantRoutes.add(route)

				const participant = pagesByUrl.get(route)
				if (!participant) throw new Error(`Ruling relation ${canonicalUrl} references missing page ${route}`)
				return { title: participant.data.title, url: participant.url }
			})

			participantPages.sort((a, b) => a.title.localeCompare(b.title))
			const resolved: ResolvedRulingRelation = {
				question: heading.content.trim(),
				canonicalTitle: page.data.title,
				canonicalUrl,
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
