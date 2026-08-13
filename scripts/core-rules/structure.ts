import type { RuleContent } from '@/lib/rules/core-rules-document'
import type { RuleBlock } from './blocks'

export type RuleSourceLocation = {
	sequence: number
	startPage: number
	startLine: number
	endPage: number
	endLine: number
	labelX: number
	bodyX: number | null
}

export type StructuredHeading = {
	id: string
	text: string
	level: 'primary' | 'secondary'
	source: RuleSourceLocation
}

export type StructuredRuleNode = {
	key: string
	id: string
	content: RuleContent[]
	children: StructuredRuleNode[]
	source: RuleSourceLocation
}

export type StructureDiagnostic = {
	severity: 'warning' | 'error'
	code: string
	message: string
	ruleId: string
	source: RuleSourceLocation
}

export type StructuredSubsection = { heading: StructuredHeading; rules: StructuredRuleNode[] }
export type StructuredSection = {
	heading: StructuredHeading
	preamble: StructuredRuleNode[]
	subsections: StructuredSubsection[]
}

type PendingSubsection = { heading: StructuredHeading; rules: RuleBlock[] }
type PendingSection = {
	heading: StructuredHeading
	preamble: RuleBlock[]
	subsections: PendingSubsection[]
}

function sourceLocation(block: RuleBlock): RuleSourceLocation {
	return {
		sequence: block.sequence,
		startPage: block.source.startPage,
		startLine: block.source.startLine,
		endPage: block.source.endPage,
		endLine: block.source.endLine,
		labelX: block.x,
		bodyX: block.bodyX,
	}
}

function heading(block: RuleBlock): StructuredHeading {
	if (!block.heading) throw new Error(`Rule ${block.id} is not a heading`)
	return { id: block.id, text: block.text, level: block.heading, source: sourceLocation(block) }
}

function content(lines: readonly string[]): RuleContent[] {
	return lines.map((line) => {
		if (line.startsWith('Example:')) return { kind: 'example', text: line }
		if (line.startsWith('See rule ')) return { kind: 'reference', text: line }
		if (line.startsWith('* ')) return { kind: 'bullet', text: line.slice(2) }
		return { kind: 'paragraph', text: line }
	})
}

function ruleNode(block: RuleBlock): StructuredRuleNode {
	return {
		key: `${block.page}:${block.sourceLine}:${block.sequence}`,
		id: block.id,
		content: content(block.lines),
		children: [],
		source: sourceLocation(block),
	}
}

function parentId(id: string) {
	const parts = id.split('.')
	return parts.length > 1 ? parts.slice(0, -1).join('.') : null
}

function ruleTree(
	blocks: readonly RuleBlock[],
	diagnostics: StructureDiagnostic[],
	headingId: string,
): StructuredRuleNode[] {
	const roots: StructuredRuleNode[] = []
	const nodesById = new Map<string, StructuredRuleNode>()

	for (const block of blocks) {
		const node = ruleNode(block)
		const expectedParentId = parentId(node.id)
		const parent = expectedParentId ? nodesById.get(expectedParentId) : undefined
		const headingIsParent = expectedParentId === headingId

		if (expectedParentId && !parent && !headingIsParent) {
			diagnostics.push({
				severity: 'warning',
				code: 'orphan-rule',
				message: `Rule ${node.id} has no parent rule ${expectedParentId} in its subsection.`,
				ruleId: node.id,
				source: node.source,
			})
		}

		if (parent) parent.children.push(node)
		else roots.push(node)
		nodesById.set(node.id, node)
	}
	return roots
}

function finalizeSection(section: PendingSection, diagnostics: StructureDiagnostic[]): StructuredSection {
	return {
		heading: section.heading,
		preamble: ruleTree(section.preamble, diagnostics, section.heading.id),
		subsections: section.subsections.map((subsection) => ({
			heading: subsection.heading,
			rules: ruleTree(subsection.rules, diagnostics, subsection.heading.id),
		})),
	}
}

export function structureRuleBlocks(blocks: readonly RuleBlock[]) {
	const sections: StructuredSection[] = []
	const diagnostics: StructureDiagnostic[] = []
	let currentSection: PendingSection | null = null
	let currentSubsection: PendingSubsection | null = null

	for (const block of blocks) {
		if (block.headingStyleMismatch) {
			const { labelFontSize, bodyFontSize } = block.headingStyleMismatch
			diagnostics.push({
				severity: 'warning',
				code: 'heading-style-mismatch',
				message: `Rule ${block.id} has a ${labelFontSize}pt heading-sized label but ${bodyFontSize === null ? 'no same-line body text' : `${bodyFontSize}pt body text`}; preserving it as a rule.`,
				ruleId: block.id,
				source: sourceLocation(block),
			})
		}

		if (block.heading === 'primary') {
			if (currentSection) sections.push(finalizeSection(currentSection, diagnostics))
			currentSection = { heading: heading(block), preamble: [], subsections: [] }
			currentSubsection = null
			continue
		}

		if (block.heading === 'secondary') {
			if (!currentSection) {
				diagnostics.push({
					severity: 'error',
					code: 'secondary-before-primary-heading',
					message: `Secondary heading ${block.id} appears before a primary heading.`,
					ruleId: block.id,
					source: sourceLocation(block),
				})
				continue
			}

			currentSubsection = { heading: heading(block), rules: [] }
			currentSection.subsections.push(currentSubsection)
			continue
		}

		if (!currentSection) {
			diagnostics.push({
				severity: 'error',
				code: 'block-before-primary-heading',
				message: `Rule ${block.id} appears before a primary heading.`,
				ruleId: block.id,
				source: sourceLocation(block),
			})
			continue
		}

		if (currentSubsection) currentSubsection.rules.push(block)
		else currentSection.preamble.push(block)
	}

	if (currentSection) sections.push(finalizeSection(currentSection, diagnostics))
	return { sections, diagnostics }
}
