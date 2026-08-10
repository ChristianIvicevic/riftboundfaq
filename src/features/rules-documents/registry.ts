import {
	compileRulesDocument,
	RulesDocumentInvariantError,
	type SourceRulesDocument,
} from '@/features/rules-documents/compile'
import { adaptCoreRulesDocument, coreRulesDiffId } from '@/features/rules-documents/core-rules-adapter'
import {
	adaptTournamentRulesDocument,
	tournamentRulesDiffId,
} from '@/features/rules-documents/tournament-rules-adapter'
import {
	CURRENT_PDF_CORE_RULES_VERSION,
	PDF_CORE_RULES_VERSION_NAMES,
	PDF_CORE_RULES_VERSIONS,
} from '@/generated/core-rules'
import {
	CURRENT_PDF_TOURNAMENT_RULES_VERSION,
	PDF_TOURNAMENT_RULES_DOCUMENTS,
} from '@/generated/tournament-rules'
import type { RulesDocumentContent } from '@/lib/rules/document-types'

export { RulesDocumentInvariantError }

export type RulesDocumentFamily = 'core-rules' | 'tournament-rules'

export type RulesDocumentReference = {
	readonly type: RulesDocumentFamily
	readonly version: string
}

export type RegisteredRulesVersionSummary = RulesDocumentReference & {
	readonly name: string | null
	readonly status: 'current' | 'archived'
}

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

export class UnknownRulesVersionError extends Error {
	constructor(
		readonly family: RulesDocumentFamily,
		readonly version: string,
	) {
		const label = family === 'core-rules' ? 'Core Rules' : 'Tournament Rules'
		super(`Unknown ${label} version ${JSON.stringify(version)}`)
	}
}

function createFamilyCatalog<Document extends { version: string }>({
	type,
	currentVersion,
	documents,
	names = {},
	adapt,
	diffId,
}: {
	type: RulesDocumentFamily
	currentVersion: string
	documents: Record<string, Document>
	names?: Record<string, string>
	adapt: (document: Document) => SourceRulesDocument
	diffId: (id: string | null, occurrence: number) => string
}) {
	if (!documents[currentVersion]) {
		throw new RulesDocumentInvariantError(
			type,
			currentVersion,
			undefined,
			'current rules version is not registered',
		)
	}
	const registeredVersions = Object.freeze(
		Object.keys(documents).map((version) =>
			Object.freeze({
				type,
				version,
				name: names[version] ?? null,
				status: version === currentVersion ? ('current' as const) : ('archived' as const),
			}),
		),
	)
	const compiled = new Map<string, TraversedRulesDocument>()

	const find = (version: string) => {
		const existing = compiled.get(version)
		if (existing) return existing
		if (!documents[version]) return
		const identity = registeredVersions.find((candidate) => candidate.version === version)!
		const document = compileRulesDocument({
			identity,
			source: adapt(documents[version]),
			diffId,
		})
		compiled.set(version, document)
		return document
	}

	return {
		get current() {
			return find(currentVersion)!
		},
		registeredVersions,
		get(version: string) {
			const document = find(version)
			if (!document) throw new UnknownRulesVersionError(type, version)
			return document
		},
		find,
	}
}

const families = {
	'core-rules': createFamilyCatalog({
		type: 'core-rules',
		currentVersion: CURRENT_PDF_CORE_RULES_VERSION,
		documents: PDF_CORE_RULES_VERSIONS,
		names: PDF_CORE_RULES_VERSION_NAMES,
		adapt: adaptCoreRulesDocument,
		diffId: coreRulesDiffId,
	}),
	'tournament-rules': createFamilyCatalog({
		type: 'tournament-rules',
		currentVersion: CURRENT_PDF_TOURNAMENT_RULES_VERSION,
		documents: PDF_TOURNAMENT_RULES_DOCUMENTS,
		adapt: adaptTournamentRulesDocument,
		diffId: tournamentRulesDiffId,
	}),
}

export const rulesDocuments = {
	get(reference: RulesDocumentReference) {
		return families[reference.type].get(reference.version)
	},
	find(reference: RulesDocumentReference) {
		return families[reference.type].find(reference.version)
	},
	family(type: RulesDocumentFamily) {
		return families[type]
	},
}
