import type {
	TournamentRuleContent,
	TournamentRuleNode,
	TournamentRulesHeading,
	TournamentRulesSection,
	TournamentRulesSectionBlock,
} from '@/lib/rules/tournament-rules-document'
import type { TournamentRulesSourceRow } from './source-rows'

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

type SourceSection = { heading: TournamentRulesHeading; rows: TournamentRulesSourceRow[] }
type PendingSubsection = {
	kind: 'subsection'
	heading: TournamentRulesHeading
	rows: TournamentRulesSourceRow[]
}
type PendingRules = { kind: 'rules'; rules: TournamentRuleNode[] }
type PreservedRow = {
	sequence: number
	id: string | null
	text: string
	parentId?: string | null
	blockId?: string | null
}

function rowId(row: TournamentRulesSourceRow): string | null {
	return row.label?.id ?? null
}

function heading(row: TournamentRulesSourceRow): TournamentRulesHeading {
	return { sequence: row.sequence, id: row.label!.id!, text: row.text }
}

function content(row: TournamentRulesSourceRow): TournamentRuleContent[] {
	if (row.text.startsWith('Example:')) return [{ kind: 'example', text: row.text }]
	if (row.text.startsWith('See ')) return [{ kind: 'reference', text: row.text }]
	return [{ kind: 'paragraph', text: row.text }]
}

function ruleNode(row: TournamentRulesSourceRow): TournamentRuleNode {
	return {
		sequence: row.sequence,
		id: rowId(row),
		label: row.label?.text ?? null,
		content: content(row),
		children: [],
	}
}

function collectRuleRows(
	rules: TournamentRuleNode[],
	rows: PreservedRow[],
	parentRuleId: string | null = null,
	blockId: string | null = null,
): void {
	for (const rule of rules) {
		rows.push({
			sequence: rule.sequence,
			id: rule.id,
			text: rule.content.map(({ text }) => text).join('\n'),
			parentId: parentRuleId,
			blockId,
		})
		collectRuleRows(rule.children, rows, rule.id, blockId)
	}
}

function assertRowsPreserved(
	sourceRows: readonly TournamentRulesSourceRow[],
	sections: TournamentRulesSection[],
): void {
	const expected = sourceRows
		.filter(({ activity }) => activity.status === 'active')
		.map((row) => ({ sequence: row.sequence, id: rowId(row), text: row.text }))
	const actual: PreservedRow[] = []

	for (const section of sections) {
		actual.push(section.heading)
		for (const block of section.blocks) {
			if (block.kind === 'subsection') actual.push(block.heading)
			collectRuleRows(block.rules, actual, null, block.kind === 'subsection' ? block.heading.id : 'section')
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
				const actualDescription = structured ? `found row ${structured.sequence}` : 'reached the end'
				throw new Error(
					`structuring did not preserve active row ${source.sequence}: ${sourceStatus}; ${actualDescription}`,
				)
			}
			throw new Error(`structuring duplicated active row ${structured.sequence}`)
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
	rows: readonly TournamentRulesSourceRow[],
	diagnostics: TournamentStructureDiagnostic[],
	headingId: string,
): TournamentRuleNode[] {
	const roots: TournamentRuleNode[] = []
	const nodesById = new Map<string, TournamentRuleNode>()
	let previousNumberedId: string | null = null

	for (const row of rows) {
		const node = ruleNode(row)
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
	let sectionRules: TournamentRulesSourceRow[] = []
	let previousNumberedId: string | null = null
	const flushSectionRules = () => {
		if (sectionRules.length === 0) return
		blocks.push({ kind: 'rules', rules: ruleTree(sectionRules, diagnostics, section.heading.id) })
		sectionRules = []
	}

	for (const row of section.rows) {
		if (row.kind === 'secondary-heading') {
			flushSectionRules()
			currentSubsection = { kind: 'subsection', heading: heading(row), rows: [] }
			blocks.push(currentSubsection)
			previousNumberedId = rowId(row)
			continue
		}

		const subsectionId = currentSubsection?.heading.id
		const id = rowId(row)
		const belongsToSubsection = subsectionId
			? id?.startsWith(`${subsectionId}.`) || (!id && previousNumberedId?.startsWith(`${subsectionId}.`))
			: false
		if (belongsToSubsection && currentSubsection) currentSubsection.rows.push(row)
		else {
			currentSubsection = null
			sectionRules.push(row)
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
						rules: ruleTree(block.rows, diagnostics, block.heading.id),
					},
		),
	}
}

export function structureTournamentRows(rows: readonly TournamentRulesSourceRow[]): TournamentRulesStructure {
	const sections: TournamentRulesSection[] = []
	const diagnostics: TournamentStructureDiagnostic[] = []
	let currentSection: SourceSection | null = null

	for (const row of rows.filter(({ activity }) => activity.status === 'active')) {
		if (row.kind === 'primary-heading') {
			if (currentSection) sections.push(finalizeSection(currentSection, diagnostics))
			currentSection = { heading: heading(row), rows: [] }
			continue
		}

		if (!currentSection) {
			diagnostics.push({
				code:
					row.kind === 'secondary-heading'
						? 'secondary-before-primary-heading'
						: 'rule-before-primary-heading',
				sequence: row.sequence,
				id: rowId(row),
			})
			continue
		}
		currentSection.rows.push(row)
	}

	if (currentSection) sections.push(finalizeSection(currentSection, diagnostics))
	assertRowsPreserved(rows, sections)
	return { sections, diagnostics }
}
