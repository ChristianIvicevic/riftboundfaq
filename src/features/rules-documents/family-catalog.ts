import {
	compileRulesDocument,
	RulesDocumentInvariantError,
	type SourceRulesDocument,
} from '@/features/rules-documents/compile'
import { rulesDocumentFamily, type RulesDocumentFamilyId } from '@/lib/rules/document-family-conventions'
import type { RulesDocumentContent } from '@/lib/rules/document-types'

export { RulesDocumentInvariantError }

export type RulesDocumentFamily = RulesDocumentFamilyId

export type RulesDocumentReference = {
	readonly type: RulesDocumentFamily
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
}

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

export type TraversedRulesDocument = {
	readonly identity: RegisteredRulesVersionSummary
	readonly sections: readonly TraversedRulesSection[]
	readonly navigation: readonly TraversedRulesHeading[]
	readonly diffRecords: readonly RulesDiffRecord[]
	referenceTarget(id: string): RulesReferenceTarget | undefined
	lookupText(id: string): string | undefined
}

export type RulesDocumentFamilyCatalog = Readonly<{
	registeredVersions: readonly RegisteredRulesVersionSummary[]
	currentTransition: CurrentRulesTransition | undefined
	readonly current: TraversedRulesDocument
	get(version: string): TraversedRulesDocument
	find(version: string): TraversedRulesDocument | undefined
}>

export class UnknownRulesVersionError extends Error {
	constructor(
		readonly family: RulesDocumentFamily,
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
	type: RulesDocumentFamily
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

	const registeredVersions: readonly RegisteredRulesVersionSummary[] = Object.freeze(
		versions.map((version) => {
			const summary = {
				type,
				version,
				name: names[version] ?? null,
			}
			return version === currentVersion
				? Object.freeze({ ...summary, status: 'current' as const })
				: Object.freeze({ ...summary, status: 'archived' as const })
		}),
	)
	const summaries = new Map(registeredVersions.map((summary) => [summary.version, summary]))
	const currentSummary = registeredVersions.at(-1)! as CurrentRulesVersionSummary
	const previousSummary = registeredVersions.at(-2) as ArchivedRulesVersionSummary | undefined
	const currentTransition = previousSummary
		? Object.freeze({ from: previousSummary, to: currentSummary })
		: undefined
	const compiled = new Map<string, TraversedRulesDocument>()

	const find = (version: string) => {
		const existing = compiled.get(version)
		if (existing) return existing
		const source = sources.get(version)
		if (!source) return
		const document = compileRulesDocument({
			identity: summaries.get(version)!,
			source: adapt(source),
			diffId,
		})
		compiled.set(version, document)
		return document
	}

	return Object.freeze({
		get current() {
			return find(currentVersion)!
		},
		registeredVersions,
		currentTransition,
		get(version: string) {
			const document = find(version)
			if (!document) throw new UnknownRulesVersionError(type, version)
			return document
		},
		find,
	})
}
