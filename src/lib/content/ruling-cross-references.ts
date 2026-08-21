import type { RulingCrossReferenceDefinitions } from '@/lib/content/ruling-cross-references-schema'

type ReferencePage = {
	url: string
	path: string
	data: {
		title: string
		toc: readonly { url: string; depth: number }[]
		structuredData: {
			headings: readonly { id: string; content: unknown }[]
		}
		rulingCrossReferences?: RulingCrossReferenceDefinitions
	}
}

export type ResolvedRulingCrossReference = {
	readonly type: 'canonical' | 'interaction'
	readonly question: string
	readonly url: string
}

export type RulingCrossReferenceIndex = ReadonlyMap<string, readonly ResolvedRulingCrossReference[]>

type Relationship = {
	type: 'canonical' | 'interaction'
	sourceUrl: string
	destinationUrl: string
}

const EMPTY_REFERENCES: readonly ResolvedRulingCrossReference[] = Object.freeze([])

function splitAnswerUrl(answerUrl: string) {
	const hashIndex = answerUrl.lastIndexOf('#')
	return { pageUrl: answerUrl.slice(0, hashIndex), anchor: answerUrl.slice(hashIndex + 1) }
}

function getAnswer(page: ReferencePage, anchor: string, role: 'source' | 'destination') {
	const answerUrl = `${page.url}#${anchor}`
	const tocItem = page.data.toc.find((item) => item.url === `#${anchor}`)
	if (!tocItem)
		throw new Error(`Ruling cross-reference references missing anchor ${answerUrl} in ${page.path}`)
	if (tocItem.depth !== 2)
		throw new Error(`Ruling cross-reference must reference an H2 Ruling answer ${answerUrl} in ${page.path}`)

	const heading = page.data.structuredData.headings.find((item) => item.id === anchor)
	if (!heading || typeof heading.content !== 'string' || heading.content.trim() === '')
		throw new Error(
			`Ruling cross-reference ${answerUrl} must have a plain-text ${role} label in ${page.path}`,
		)

	return { question: heading.content.trim(), url: answerUrl }
}

function registerRelationship(relationships: Map<string, Relationship>, relationship: Relationship) {
	const { type, sourceUrl, destinationUrl } = relationship
	const pairKey = [sourceUrl, destinationUrl].toSorted().join('\0')
	const existing = relationships.get(pairKey)
	if (!existing) {
		relationships.set(pairKey, relationship)
		return
	}

	if (existing.type === type && (type === 'interaction' || existing.sourceUrl === sourceUrl))
		throw new Error(
			`Ruling cross-reference contains duplicate ${type} relationship between ${sourceUrl} and ${destinationUrl}`,
		)

	throw new Error(
		`Ruling cross-reference has incompatible directionality between ${sourceUrl} and ${destinationUrl}`,
	)
}

export function buildRulingCrossReferenceIndex(pages: readonly ReferencePage[]): RulingCrossReferenceIndex {
	const pagesByUrl = new Map(pages.map((page) => [page.url, page]))
	const index = new Map<string, ResolvedRulingCrossReference[]>()
	const relationships = new Map<string, Relationship>()

	const addReference = (sourceUrl: string, reference: ResolvedRulingCrossReference) => {
		const references = index.get(sourceUrl) ?? []
		if (!index.has(sourceUrl)) index.set(sourceUrl, references)
		references.push(reference)
	}

	for (const page of pages) {
		for (const [sourceAnchor, definitions] of Object.entries(page.data.rulingCrossReferences ?? {})) {
			const source = getAnswer(page, sourceAnchor, 'source')

			for (const definition of definitions) {
				const { pageUrl: destinationPageUrl, anchor: destinationAnchor } = splitAnswerUrl(
					definition.destination,
				)
				const destinationPage = pagesByUrl.get(destinationPageUrl)
				if (!destinationPage)
					throw new Error(
						`Ruling cross-reference ${source.url} references missing page ${destinationPageUrl}`,
					)

				const destination = getAnswer(destinationPage, destinationAnchor, 'destination')
				if (source.url === destination.url)
					throw new Error(`Ruling cross-reference ${source.url} cannot reference itself`)

				registerRelationship(relationships, {
					type: definition.type,
					sourceUrl: source.url,
					destinationUrl: destination.url,
				})

				addReference(source.url, {
					type: definition.type,
					question: destination.question,
					url: destination.url,
				})
				if (definition.type === 'interaction')
					addReference(destination.url, {
						type: definition.type,
						question: source.question,
						url: source.url,
					})
			}
		}
	}

	for (const references of index.values()) {
		references.sort(
			(left, right) => left.question.localeCompare(right.question) || left.url.localeCompare(right.url),
		)
	}

	return index
}

export function getRulingCrossReferences(
	index: RulingCrossReferenceIndex,
	pageUrl: string,
	anchor: string,
): readonly ResolvedRulingCrossReference[] {
	return index.get(`${pageUrl}#${anchor}`) ?? EMPTY_REFERENCES
}
