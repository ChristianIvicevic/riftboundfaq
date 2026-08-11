import type {
	RegisteredRulesVersionSummary,
	RulesDiffRecord,
	RulesDocumentFamily,
	RulesReferenceTarget,
	TraversedRule,
	TraversedRulesBlock,
	TraversedRulesDocument,
	TraversedRulesHeading,
	TraversedRulesSection,
} from '@/features/rules-documents/family-catalog'
import type { RulesDocumentContent } from '@/lib/rules/document-types'

export type SourceRulesHeading = {
	sequence: number
	id: string
	text: string
	label: string
	depth: 2 | 3
}

export type SourceRule = {
	sequence: number
	id: string | null
	label: string | null
	diffLabel: string
	content: readonly RulesDocumentContent[]
	children: readonly SourceRule[]
}

export type SourceRulesBlock =
	| { kind: 'rules'; rules: readonly SourceRule[] }
	| { kind: 'subsection'; heading: SourceRulesHeading; rules: readonly SourceRule[] }

export type SourceRulesSection = {
	heading: SourceRulesHeading
	blocks: readonly SourceRulesBlock[]
}

export type SourceRulesDocument = {
	version: string
	sections: readonly SourceRulesSection[]
}

export class RulesDocumentInvariantError extends Error {
	constructor(
		readonly family: RulesDocumentFamily,
		readonly version: string,
		readonly sequence: number | undefined,
		invariant: string,
		options?: ErrorOptions,
	) {
		super(
			`${family === 'core-rules' ? 'Core Rules' : 'Tournament Rules'} ${version}${sequence === undefined ? '' : ` source row ${sequence}`}: ${invariant}`,
			options,
		)
	}
}

export function compileRulesDocument({
	identity,
	source,
	diffId,
}: {
	identity: RegisteredRulesVersionSummary
	source: SourceRulesDocument
	diffId: (id: string | null, occurrence: number) => string
}): TraversedRulesDocument {
	if (source.version !== identity.version) {
		throw new RulesDocumentInvariantError(
			identity.type,
			identity.version,
			undefined,
			`document version ${JSON.stringify(source.version)} does not match its registered version`,
		)
	}

	const navigation: TraversedRulesHeading[] = []
	const diffRecords: RulesDiffRecord[] = []
	const referenceTargets = new Map<string, RulesReferenceTarget>()
	const lookup = new Map<string, string>()
	const anchorOccurrences = new Map<string, number>()
	const diffOccurrences = new Map<string, number>()
	const sequences = new Set<number>()
	let previousSequence = 0

	const registerSequence = (sequence: number) => {
		if (!Number.isSafeInteger(sequence) || sequence < 1) {
			throw new RulesDocumentInvariantError(
				identity.type,
				identity.version,
				sequence,
				'invalid source sequence',
			)
		}
		if (sequences.has(sequence)) {
			throw new RulesDocumentInvariantError(
				identity.type,
				identity.version,
				sequence,
				'duplicate source sequence',
			)
		}
		if (sequence <= previousSequence) {
			throw new RulesDocumentInvariantError(
				identity.type,
				identity.version,
				sequence,
				`source sequence follows ${previousSequence}`,
			)
		}
		sequences.add(sequence)
		previousSequence = sequence
	}

	const allocateAnchor = (id: string | null, sequence: number) => {
		if (id === null) return `U${sequence}`
		const occurrence = (anchorOccurrences.get(id) ?? 0) + 1
		anchorOccurrences.set(id, occurrence)
		return `R${id}${occurrence === 1 ? '' : `-${occurrence}`}`
	}

	const appendRecord = ({
		sequence,
		id,
		diffLabel,
		lines,
		anchor,
	}: {
		sequence: number
		id: string | null
		diffLabel: string
		lines: string[]
		anchor: string
	}) => {
		const occurrenceKey = id ?? 'unnumbered'
		const occurrence = (diffOccurrences.get(occurrenceKey) ?? 0) + 1
		diffOccurrences.set(occurrenceKey, occurrence)
		let recordId: string
		try {
			recordId = diffId(id, occurrence)
		} catch {
			throw new RulesDocumentInvariantError(
				identity.type,
				identity.version,
				sequence,
				'invalid diff identity',
			)
		}
		if (!recordId) {
			throw new RulesDocumentInvariantError(
				identity.type,
				identity.version,
				sequence,
				'invalid diff identity',
			)
		}
		diffRecords.push(Object.freeze({ id: recordId, lines: Object.freeze(lines), anchor, label: diffLabel }))
		if (id !== null) {
			if (!referenceTargets.has(id)) referenceTargets.set(id, Object.freeze({ id, anchor }))
			if (!lookup.has(id)) lookup.set(id, lines.join(' '))
		}
	}

	const compileHeading = (heading: SourceRulesHeading): TraversedRulesHeading => {
		registerSequence(heading.sequence)
		const anchor = allocateAnchor(heading.id, heading.sequence)
		const compiled = Object.freeze({ id: heading.id, text: heading.text, anchor, depth: heading.depth })
		navigation.push(compiled)
		appendRecord({
			sequence: heading.sequence,
			id: heading.id,
			diffLabel: heading.label,
			lines: [heading.text],
			anchor,
		})
		return compiled
	}

	const compileRules = (rules: readonly SourceRule[]): readonly TraversedRule[] =>
		Object.freeze(
			rules.map((rule) => {
				registerSequence(rule.sequence)
				const anchor = allocateAnchor(rule.id, rule.sequence)
				appendRecord({
					sequence: rule.sequence,
					id: rule.id,
					diffLabel: rule.diffLabel,
					lines: rule.content.map(({ text }) => text),
					anchor,
				})
				return Object.freeze({
					id: rule.id,
					label: rule.label,
					anchor,
					content: Object.freeze(rule.content.map((entry) => Object.freeze({ ...entry }))),
					children: compileRules(rule.children),
				})
			}),
		)

	const sections: TraversedRulesSection[] = source.sections.map((section) => {
		const heading = compileHeading(section.heading)
		const blocks: readonly TraversedRulesBlock[] = Object.freeze(
			section.blocks.map((block) => {
				if (block.kind === 'rules') {
					return Object.freeze({ kind: 'rules' as const, rules: compileRules(block.rules) })
				}
				return Object.freeze({
					kind: 'subsection',
					heading: compileHeading(block.heading),
					rules: compileRules(block.rules),
				})
			}),
		)
		return Object.freeze({ heading, blocks })
	})

	return Object.freeze({
		identity,
		sections: Object.freeze(sections),
		navigation: Object.freeze(navigation),
		diffRecords: Object.freeze(diffRecords),
		referenceTarget: (id) => referenceTargets.get(id),
		lookupText: (id) => lookup.get(id),
	})
}
