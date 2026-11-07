import {
	compileRulesDocument,
	RulesDocumentInvariantError,
	type SourceRulesDocument,
} from '@/features/rules-documents/compile'
import {
	compareRulesDocuments,
	type RulesDiffRecord,
	type RulesDocumentComparison,
} from '@/features/rules-documents/document-comparison'
import { rulesDocumentFamily, type RulesDocumentFamilyId } from '@/lib/rules/document-family-conventions'
import type { RulesDocumentContent } from '@/lib/rules/document-types'

export { RulesDocumentInvariantError }

export type RulesDocumentReference = {
	readonly type: RulesDocumentFamilyId
	readonly version: string
}

type RulesVersionSummary = RulesDocumentReference & {
	readonly name: string | null
}

type ArchivedRulesVersionSummary = RulesVersionSummary & {
	readonly status: 'archived'
}

type CurrentRulesVersionSummary = RulesVersionSummary & {
	readonly status: 'current'
}

export type RegisteredRulesVersionSummary = ArchivedRulesVersionSummary | CurrentRulesVersionSummary

export type TraversedRulesHeading = {
	readonly id: string
	readonly text: string
	readonly anchor: string
	readonly depth: 2 | 3
	readonly changeMarker?: RuleChangeMarker
}

export type TraversedRule = {
	readonly id: string | null
	readonly label: string | null
	readonly anchor: string
	readonly content: readonly RulesDocumentContent[]
	readonly children: readonly TraversedRule[]
	readonly changeMarker?: RuleChangeMarker
}

export type RuleChangeMarker = 'new' | 'changed'

export type TraversedRulesBlock =
	| { kind: 'rules'; rules: readonly TraversedRule[] }
	| { kind: 'subsection'; heading: TraversedRulesHeading; rules: readonly TraversedRule[] }

export type TraversedRulesSection = {
	readonly heading: TraversedRulesHeading
	readonly blocks: readonly TraversedRulesBlock[]
}

export type RulesReferenceTarget = {
	readonly id: string
	readonly anchor: string
}

export type CompiledRulesDocument = {
	readonly identity: RegisteredRulesVersionSummary
	readonly sections: readonly TraversedRulesSection[]
	readonly navigation: readonly TraversedRulesHeading[]
	readonly diffRecords: readonly RulesDiffRecord[]
	referenceTarget(id: string): RulesReferenceTarget | undefined
	lookupText(id: string): string | undefined
}

export type RulesDocumentFamilyCatalog = Readonly<{
	registeredVersions: readonly RegisteredRulesVersionSummary[]
	currentVersion: CurrentRulesVersionSummary
	readonly current: CompiledRulesDocument
	get(version: string): CompiledRulesDocument
	find(version: string): CompiledRulesDocument | undefined
	compare(from: string, to: string): RulesDocumentComparison
}>

export class UnknownRulesVersionError extends Error {
	constructor(
		readonly family: RulesDocumentFamilyId,
		readonly version: string,
	) {
		const label = rulesDocumentFamily(family).label
		super(`Unknown ${label} version ${JSON.stringify(version)}`)
	}
}

export function createRulesDocumentFamilyCatalog<Document extends { readonly version: string }>({
	type,
	currentVersion,
	documents,
	names = {},
	adapt,
}: Readonly<{
	type: RulesDocumentFamilyId
	currentVersion: string
	documents: Readonly<Record<string, Document>>
	names?: Readonly<Record<string, string>>
	adapt: (document: Document) => SourceRulesDocument
}>): RulesDocumentFamilyCatalog {
	const conventions = rulesDocumentFamily(type)
	const sources = new Map(Object.entries(documents))
	if (sources.size === 0) {
		throw new RulesDocumentInvariantError(type, currentVersion, undefined, 'no registered rules versions')
	}

	for (const version of sources.keys()) {
		try {
			conventions.version(version)
		} catch (cause) {
			throw new RulesDocumentInvariantError(type, version, undefined, 'invalid registered rules version', {
				cause,
			})
		}
	}

	const versions = [...sources.keys()].toSorted(conventions.compareVersions)
	if (!sources.has(currentVersion)) {
		throw new RulesDocumentInvariantError(
			type,
			currentVersion,
			undefined,
			'current rules version is not registered',
		)
	}
	const greatestVersion = versions.at(-1)!
	if (currentVersion !== greatestVersion) {
		throw new RulesDocumentInvariantError(
			type,
			currentVersion,
			undefined,
			`current rules version is not the greatest registered rules version ${JSON.stringify(greatestVersion)}`,
		)
	}

	const archivedSummaries: readonly ArchivedRulesVersionSummary[] = Object.freeze(
		versions.slice(0, -1).map((version) =>
			Object.freeze({
				type,
				version,
				name: names[version] ?? null,
				status: 'archived' as const,
			}),
		),
	)
	const currentSummary: CurrentRulesVersionSummary = Object.freeze({
		type,
		version: currentVersion,
		name: names[currentVersion] ?? null,
		status: 'current',
	})
	const registeredVersions: readonly RegisteredRulesVersionSummary[] = Object.freeze([
		...archivedSummaries,
		currentSummary,
	])
	const summaries = new Map(registeredVersions.map((summary) => [summary.version, summary]))
	const previousVersions = new Map(
		versions.slice(1).map((version, index) => [version, versions[index]!] as const),
	)
	const compiled = new Map<string, CompiledRulesDocument>()
	const marked = new Map<string, CompiledRulesDocument>()
	const compile = (version: string) => {
		const existing = compiled.get(version)
		if (existing) return existing
		const source = sources.get(version)
		if (!source) return
		const document = compileRulesDocument({
			identity: summaries.get(version)!,
			source: adapt(source),
		})
		compiled.set(version, document)
		return document
	}
	const comparisons = new Map<string, RulesDocumentComparison>()
	const comparison = (from: string, to: string) => {
		const key = `${from}\0${to}`
		const existing = comparisons.get(key)
		if (existing) return existing
		const prepared = compareRulesDocuments(
			compile(from)!.diffRecords,
			compile(to)!.diffRecords,
			type === 'tournament-rules' ? 'tournament' : 'generic',
		)
		comparisons.set(key, prepared)
		return prepared
	}

	const find = (version: string) => {
		const existing = marked.get(version)
		if (existing) return existing
		let document = compile(version)
		if (!document) return
		const previousVersion = previousVersions.get(version)
		if (previousVersion) {
			const markers = new Map<string, RuleChangeMarker>()
			for (const entry of comparison(previousVersion, version).entries) {
				if (entry.kind === 'added') markers.set(entry.rule.anchor, 'new')
				if (entry.kind === 'modified') markers.set(entry.newRule.anchor, 'changed')
			}
			const addMarkers = (rules: readonly TraversedRule[]): readonly TraversedRule[] =>
				Object.freeze(
					rules.map((rule) =>
						Object.freeze({
							...rule,
							changeMarker: markers.get(rule.anchor),
							children: addMarkers(rule.children),
						}),
					),
				)
			const markedHeadings = new Map(
				document.navigation.map((heading) => [
					heading.anchor,
					Object.freeze({ ...heading, changeMarker: markers.get(heading.anchor) }),
				]),
			)
			document = Object.freeze({
				...document,
				navigation: Object.freeze(document.navigation.map(({ anchor }) => markedHeadings.get(anchor)!)),
				sections: Object.freeze(
					document.sections.map((section) =>
						Object.freeze({
							...section,
							heading: markedHeadings.get(section.heading.anchor)!,
							blocks: Object.freeze(
								section.blocks.map((block) => {
									const rules = addMarkers(block.rules)
									if (block.kind === 'rules') return Object.freeze({ ...block, rules })
									return Object.freeze({
										...block,
										heading: markedHeadings.get(block.heading.anchor)!,
										rules,
									})
								}),
							),
						}),
					),
				),
			})
		}
		marked.set(version, document)
		return document
	}

	return Object.freeze({
		get current() {
			return find(currentVersion)!
		},
		registeredVersions,
		currentVersion: currentSummary,
		compare: comparison,
		get(version: string) {
			const document = find(version)
			if (!document) throw new UnknownRulesVersionError(type, version)
			return document
		},
		find,
	})
}
