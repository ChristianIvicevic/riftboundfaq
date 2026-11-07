import type { RulesDiffRecord } from '@/features/rules-documents/document-comparison'
import type {
	RegisteredRulesVersionSummary,
	RulesReferenceTarget,
	TraversedRule,
	TraversedRulesBlock,
	CompiledRulesDocument,
	TraversedRulesHeading,
	TraversedRulesSection,
} from '@/features/rules-documents/family-catalog'
import type { RulesDocumentFamilyId } from '@/lib/rules/document-family-conventions'
import type { RulesDocumentContent } from '@/lib/rules/document-types'

type SourceRulesHeading = {
	sequence: number
	id: string
	text: string
	depth: 2 | 3
}

export type SourceRule = {
	sequence: number
	id: string | null
	label: string | null
	content: readonly RulesDocumentContent[]
	children: readonly SourceRule[]
}

type SourceRulesBlock =
	| { kind: 'rules'; rules: readonly SourceRule[] }
	| { kind: 'subsection'; heading: SourceRulesHeading; rules: readonly SourceRule[] }

type SourceRulesSection = {
	heading: SourceRulesHeading
	blocks: readonly SourceRulesBlock[]
}

export type SourceRulesDocument = {
	version: string
	sections: readonly SourceRulesSection[]
}

export class RulesDocumentInvariantError extends Error {
	constructor(
		readonly family: RulesDocumentFamilyId,
		readonly version: string,
		readonly sequence: number | undefined,
		invariant: string,
		options?: ErrorOptions,
	) {
		super(
			`${family === 'core-rules' ? 'Core Rules' : 'Tournament Rules'} ${version}${sequence === undefined ? '' : ` source entry ${sequence}`}: ${invariant}`,
			options,
		)
	}
}

export function compileRulesDocument({
	identity,
	source,
}: {
	identity: RegisteredRulesVersionSummary
	source: SourceRulesDocument
}): CompiledRulesDocument {
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
		id,
		content,
		anchor,
		parentAnchor,
		kind,
		headingDepth,
	}: {
		id: string | null
		content: readonly RulesDocumentContent[]
		anchor: string
		parentAnchor: string | null
		kind: 'heading' | 'rule'
		headingDepth?: 2 | 3
	}) => {
		let record: RulesDiffRecord = {
			id,
			content: Object.freeze(content.map((entry) => Object.freeze({ ...entry }))),
			anchor,
			parentAnchor,
			kind,
		}
		if (headingDepth !== undefined) record = { ...record, headingDepth }
		diffRecords.push(Object.freeze(record))
		if (id !== null) {
			if (!referenceTargets.has(id)) referenceTargets.set(id, Object.freeze({ id, anchor }))
			if (!lookup.has(id)) lookup.set(id, content.map(({ text }) => text).join(' '))
		}
	}

	const compileHeading = (
		heading: SourceRulesHeading,
		parentAnchor: string | null,
	): TraversedRulesHeading => {
		registerSequence(heading.sequence)
		const anchor = allocateAnchor(heading.id, heading.sequence)
		const compiled = Object.freeze({ id: heading.id, text: heading.text, anchor, depth: heading.depth })
		navigation.push(compiled)
		appendRecord({
			id: heading.id,
			content: [{ kind: 'paragraph', text: heading.text }],
			anchor,
			parentAnchor,
			kind: 'heading',
			headingDepth: heading.depth,
		})
		return compiled
	}

	const compileRules = (rules: readonly SourceRule[], parentAnchor: string): readonly TraversedRule[] =>
		Object.freeze(
			rules.map((rule) => {
				registerSequence(rule.sequence)
				const anchor = allocateAnchor(rule.id, rule.sequence)
				appendRecord({
					id: rule.id,
					content: rule.content,
					anchor,
					parentAnchor,
					kind: 'rule',
				})
				return Object.freeze({
					id: rule.id,
					label: rule.label,
					anchor,
					content: Object.freeze(rule.content.map((entry) => Object.freeze({ ...entry }))),
					children: compileRules(rule.children, anchor),
				})
			}),
		)

	const sections: TraversedRulesSection[] = source.sections.map((section) => {
		const heading = compileHeading(section.heading, null)
		const blocks: readonly TraversedRulesBlock[] = Object.freeze(
			section.blocks.map((block) => {
				if (block.kind === 'rules') {
					return Object.freeze({
						kind: 'rules' as const,
						rules: compileRules(block.rules, heading.anchor),
					})
				}
				const subsectionHeading = compileHeading(block.heading, heading.anchor)
				return Object.freeze({
					kind: 'subsection',
					heading: subsectionHeading,
					rules: compileRules(block.rules, subsectionHeading.anchor),
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
