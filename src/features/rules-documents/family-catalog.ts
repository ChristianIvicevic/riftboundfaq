import {
	compileRulesDocument,
	RulesDocumentInvariantError,
	type SourceRulesDocument,
} from '@/features/rules-documents/compile'
import { diffRuleSets, type DiffEntry } from '@/lib/rules/diff'
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

export type ArchivedRulesVersionSummary = RulesVersionSummary & {
	readonly status: 'archived'
}

export type CurrentRulesVersionSummary = RulesVersionSummary & {
	readonly status: 'current'
}

export type RegisteredRulesVersionSummary = ArchivedRulesVersionSummary | CurrentRulesVersionSummary

export type CurrentRulesTransition = Readonly<{
	from: ArchivedRulesVersionSummary
	to: CurrentRulesVersionSummary
}>

export type TraversedRulesHeading = {
	readonly id: string
	readonly text: string
	readonly anchor: string
	readonly depth: 2 | 3
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

export type RulesDiffRecord = {
	readonly id: string
	readonly lines: readonly string[]
	readonly anchor: string
	readonly label: string
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
	currentTransition: CurrentRulesTransition | undefined
	readonly current: CompiledRulesDocument
	get(version: string): CompiledRulesDocument
	find(version: string): CompiledRulesDocument | undefined
	difference(from: string, to: string): readonly DiffEntry<RulesDiffRecord>[]
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
	diffId,
}: Readonly<{
	type: RulesDocumentFamilyId
	currentVersion: string
	documents: Readonly<Record<string, Document>>
	names?: Readonly<Record<string, string>>
	adapt: (document: Document) => SourceRulesDocument
	diffId: (id: string | null, occurrence: number) => string
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
	const previousSummary = archivedSummaries.at(-1)
	const currentTransition = previousSummary
		? Object.freeze({ from: previousSummary, to: currentSummary })
		: undefined
	const compiled = new Map<string, CompiledRulesDocument>()
	const differences = new Map<string, readonly DiffEntry<RulesDiffRecord>[]>()
	const difference = (from: string, to: string) => {
		const key = `${from}\0${to}`
		const existing = differences.get(key)
		if (existing) return existing
		const options =
			type === 'tournament-rules'
				? {
						hideRenumbering: true,
						hideReferenceOnlyChanges: true,
						referenceSyntax: 'tournament' as const,
					}
				: undefined
		const entries = Object.freeze(diffRuleSets(find(from)!.diffRecords, find(to)!.diffRecords, options))
		differences.set(key, entries)
		return entries
	}

	const find = (version: string) => {
		const existing = compiled.get(version)
		if (existing) return existing
		const source = sources.get(version)
		if (!source) return
		let document = compileRulesDocument({
			identity: summaries.get(version)!,
			source: adapt(source),
			diffId,
		})
		compiled.set(version, document)
		if (version === currentVersion && previousSummary) {
			const markers = new Map<string, RuleChangeMarker>()
			for (const entry of difference(previousSummary.version, currentVersion)) {
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
			document = Object.freeze({
				...document,
				sections: Object.freeze(
					document.sections.map((section) =>
						Object.freeze({
							...section,
							blocks: Object.freeze(
								section.blocks.map((block) => Object.freeze({ ...block, rules: addMarkers(block.rules) })),
							),
						}),
					),
				),
			})
			compiled.set(version, document)
		}
		return document
	}

	return Object.freeze({
		get current() {
			return find(currentVersion)!
		},
		registeredVersions,
		currentVersion: currentSummary,
		currentTransition,
		difference,
		get(version: string) {
			const document = find(version)
			if (!document) throw new UnknownRulesVersionError(type, version)
			return document
		},
		find,
	})
}
