import type {
	TournamentRuleContent,
	TournamentRuleNode,
	TournamentRulesHeading,
	TournamentRulesSection,
	TournamentRulesSectionBlock,
} from '@/lib/rules/tournament-rules-document'
import type { TournamentRulesSourceEntry } from './source-rows'

export type TournamentStructureDiagnostic =
	| {
			code: 'unnumbered-rule'
			sequence: number
			inferredParentId: string | null
	  }
	| {
			code: 'orphan-rule'
			sequence: number
			id: string
			expectedParentId: string
	  }
	| {
			code: 'secondary-before-primary-heading' | 'rule-before-primary-heading'
			sequence: number
			id: string | null
	  }

type TournamentRulesStructure = {
	sections: TournamentRulesSection[]
	diagnostics: TournamentStructureDiagnostic[]
}

type SourceSection = { heading: TournamentRulesHeading; entries: TournamentRulesSourceEntry[] }
type PendingSubsection = {
	kind: 'subsection'
	heading: TournamentRulesHeading
	entries: TournamentRulesSourceEntry[]
}
type PendingRules = { kind: 'rules'; rules: TournamentRuleNode[] }
type PreservedEntry = {
	sequence: number
	id: string | null
	text: string
	parentId?: string | null
	blockId?: string | null
}

function entryId(entry: TournamentRulesSourceEntry): string | null {
	return entry.label?.id ?? null
}

function heading(entry: TournamentRulesSourceEntry): TournamentRulesHeading {
	return { sequence: entry.sequence, id: entry.label!.id!, text: entry.text }
}

function content(entry: TournamentRulesSourceEntry): TournamentRuleContent[] {
	if (entry.text.startsWith('Example:')) return [{ kind: 'example', text: entry.text }]
	if (entry.text.startsWith('See ')) return [{ kind: 'reference', text: entry.text }]
	return [{ kind: 'paragraph', text: entry.text }]
}

function ruleNode(entry: TournamentRulesSourceEntry): TournamentRuleNode {
	return {
		sequence: entry.sequence,
		id: entryId(entry),
		label: entry.label?.text ?? null,
		content: content(entry),
		children: [],
	}
}

function collectRuleEntries(
	rules: TournamentRuleNode[],
	entries: PreservedEntry[],
	parentRuleId: string | null = null,
	blockId: string | null = null,
): void {
	for (const rule of rules) {
		entries.push({
			sequence: rule.sequence,
			id: rule.id,
			text: rule.content.map(({ text }) => text).join('\n'),
			parentId: parentRuleId,
			blockId,
		})
		collectRuleEntries(rule.children, entries, rule.id, blockId)
	}
}

function assertEntriesPreserved(
	sourceEntries: readonly TournamentRulesSourceEntry[],
	sections: TournamentRulesSection[],
): void {
	const expected = sourceEntries
		.filter(({ activity }) => activity.status === 'active')
		.map((entry) => ({ sequence: entry.sequence, id: entryId(entry), text: entry.text }))
	const actual: PreservedEntry[] = []

	for (const section of sections) {
		actual.push(section.heading)
		for (const block of section.blocks) {
			if (block.kind === 'subsection') actual.push(block.heading)
			collectRuleEntries(
				block.rules,
				actual,
				null,
				block.kind === 'subsection' ? block.heading.id : 'section',
			)
		}
	}

	for (let index = 0; index < Math.max(expected.length, actual.length); index++) {
		const source = expected[index]
		const structured = actual[index]
		if (
			source?.sequence !== structured?.sequence ||
			source?.id !== structured?.id ||
			source?.text !== structured?.text
		) {
			if (source) {
				const actualIndex = actual.findIndex(({ sequence }) => sequence === source.sequence)
				const sourceStatus =
					actualIndex === -1
						? 'is missing'
						: `moved to position ${actualIndex + 1} in ${actual[actualIndex].blockId ?? 'a heading'} under ${actual[actualIndex].parentId ?? 'no parent'}`
				const actualDescription = structured ? `found entry ${structured.sequence}` : 'reached the end'
				throw new Error(
					`structuring did not preserve active entry ${source.sequence}: ${sourceStatus}; ${actualDescription}`,
				)
			}
			throw new Error(`structuring duplicated active entry ${structured.sequence}`)
		}
	}
}

function parentId(id: string | null): string | null {
	if (!id) return null
	const parts = id.split('.')
	return parts.length > 1 ? parts.slice(0, -1).join('.') : null
}

function nearestExistingParent(
	id: string,
	nodesById: Map<string, TournamentRuleNode>,
	headingId: string,
): TournamentRuleNode | null {
	let candidateId = parentId(id)
	while (candidateId && candidateId !== headingId) {
		const candidate = nodesById.get(candidateId)
		if (candidate) return candidate
		candidateId = parentId(candidateId)
	}
	return null
}

function ruleTree(
	entries: readonly TournamentRulesSourceEntry[],
	diagnostics: TournamentStructureDiagnostic[],
	headingId: string,
): TournamentRuleNode[] {
	const roots: TournamentRuleNode[] = []
	const nodesById = new Map<string, TournamentRuleNode>()
	let previousNumberedId: string | null = null

	for (const entry of entries) {
		const node = ruleNode(entry)
		if (!node.id) {
			const inferredParentId = parentId(previousNumberedId)
			const inferredParent = inferredParentId ? nodesById.get(inferredParentId) : null
			if (inferredParent) inferredParent.children.push(node)
			else roots.push(node)
			diagnostics.push({
				code: 'unnumbered-rule',
				sequence: node.sequence,
				inferredParentId: inferredParent?.id ?? null,
			})
			continue
		}

		const expectedParentId = parentId(node.id)
		const expectedParent = expectedParentId ? nodesById.get(expectedParentId) : null
		const headingIsParent = expectedParentId === headingId
		if (expectedParentId && !expectedParent && !headingIsParent) {
			diagnostics.push({
				code: 'orphan-rule',
				sequence: node.sequence,
				id: node.id,
				expectedParentId,
			})
		}
		const parent = expectedParent ?? nearestExistingParent(node.id, nodesById, headingId)

		if (parent) parent.children.push(node)
		else roots.push(node)
		nodesById.set(node.id, node)
		previousNumberedId = node.id
	}

	return roots
}

function finalizeSection(
	section: SourceSection,
	diagnostics: TournamentStructureDiagnostic[],
): TournamentRulesSection {
	const blocks: (PendingRules | PendingSubsection)[] = []
	let currentSubsection: PendingSubsection | null = null
	let sectionRules: TournamentRulesSourceEntry[] = []
	let previousNumberedId: string | null = null
	const flushSectionRules = () => {
		if (sectionRules.length === 0) return
		blocks.push({ kind: 'rules', rules: ruleTree(sectionRules, diagnostics, section.heading.id) })
		sectionRules = []
	}

	for (const entry of section.entries) {
		if (entry.kind === 'secondary-heading') {
			flushSectionRules()
			currentSubsection = { kind: 'subsection', heading: heading(entry), entries: [] }
			blocks.push(currentSubsection)
			previousNumberedId = entryId(entry)
			continue
		}

		const subsectionId = currentSubsection?.heading.id
		const id = entryId(entry)
		const belongsToSubsection = subsectionId
			? id?.startsWith(`${subsectionId}.`) || (!id && previousNumberedId?.startsWith(`${subsectionId}.`))
			: false
		if (belongsToSubsection && currentSubsection) currentSubsection.entries.push(entry)
		else {
			currentSubsection = null
			sectionRules.push(entry)
		}
		if (id) previousNumberedId = id
	}
	flushSectionRules()

	return {
		heading: section.heading,
		blocks: blocks.map<TournamentRulesSectionBlock>((block) =>
			block.kind === 'rules'
				? block
				: {
						kind: block.kind,
						heading: block.heading,
						rules: ruleTree(block.entries, diagnostics, block.heading.id),
					},
		),
	}
}

export function structureTournamentRulesEntries(
	entries: readonly TournamentRulesSourceEntry[],
): TournamentRulesStructure {
	const sections: TournamentRulesSection[] = []
	const diagnostics: TournamentStructureDiagnostic[] = []
	let currentSection: SourceSection | null = null

	for (const entry of entries.filter(({ activity }) => activity.status === 'active')) {
		if (entry.kind === 'primary-heading') {
			if (currentSection) sections.push(finalizeSection(currentSection, diagnostics))
			currentSection = { heading: heading(entry), entries: [] }
			continue
		}

		if (!currentSection) {
			diagnostics.push({
				code:
					entry.kind === 'secondary-heading'
						? 'secondary-before-primary-heading'
						: 'rule-before-primary-heading',
				sequence: entry.sequence,
				id: entryId(entry),
			})
			continue
		}
		currentSection.entries.push(entry)
	}

	if (currentSection) sections.push(finalizeSection(currentSection, diagnostics))
	assertEntriesPreserved(entries, sections)
	return { sections, diagnostics }
}
