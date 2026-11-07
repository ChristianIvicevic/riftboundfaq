import { findCoreRuleReferences } from '@/features/core-rules/references'
import type {
	CompiledRulesDocument,
	RulesDiffRecord,
	RulesDocumentFamilyCatalog,
	TraversedRule,
	TraversedRulesHeading,
} from '@/features/rules-documents/family-catalog'
import type { PreparedRulesChange } from '@/features/rules-documents/rules-change'
import { findTournamentRuleReferences } from '@/features/tournament-rules/references'
import type { DiffEntry, RuleMatch } from '@/lib/rules/diff'
import type { RulesDocumentFamilyId } from '@/lib/rules/document-family-conventions'
import type { RulesDocumentContent } from '@/lib/rules/document-types'
import { coreRulesLinks, tournamentRulesLinks } from '@/lib/rules/links'
import { indexRulesText, type IndexedRulesTextToken } from '@/lib/rules/text-tokens'
import type { RuleIdLookup, RuleReference } from '@/lib/rules/types'
import { alignIndicesByScore } from '@/lib/sequence-alignment'

export type ContextualChangeStatus = 'new' | 'deleted' | 'changed'

export type ContextualChangeText = Readonly<{
	type: 'same' | 'add' | 'remove'
	text: string
	href?: string
	sourceLabel?: string
}>

export type ContextualChangeBlock = Readonly<{
	kind: RulesDocumentContent['kind']
	text: readonly ContextualChangeText[]
}>

export type ContextualChangeNode = Readonly<{
	kind: 'heading' | 'rule'
	headingDepth?: 2 | 3
	key: string
	label: string | null
	href: string
	sourceLabel: string
	status?: ContextualChangeStatus
	content: readonly ContextualChangeBlock[]
	children: readonly ContextualChangeNode[]
}>

export type ContextualRulesChange = Readonly<{
	items: readonly ContextualChangeNode[]
}>

type DocumentTreeNode = {
	kind: 'heading' | 'rule'
	headingDepth?: 2 | 3
	anchor: string
	label: string | null
	content: readonly RulesDocumentContent[]
	children: DocumentTreeNode[]
	parent: DocumentTreeNode | null
	order: number
}

type DocumentTree = {
	roots: DocumentTreeNode[]
	byAnchor: Map<string, DocumentTreeNode>
}

type MergedTreeNode = {
	newNode?: DocumentTreeNode
	oldNode?: DocumentTreeNode
	status?: ContextualChangeStatus
	children: MergedTreeNode[]
}

type ReferenceRange = RuleReference & { href: string; sourceLabel: string }

type TextDiffOperation =
	| { type: 'same'; oldToken: IndexedRulesTextToken; newToken: IndexedRulesTextToken }
	| { type: 'remove'; oldToken: IndexedRulesTextToken }
	| { type: 'add'; newToken: IndexedRulesTextToken }

type ContentAlignment =
	| { type: 'aligned'; oldContent: RulesDocumentContent; newContent: RulesDocumentContent }
	| { type: 'remove'; oldContent: RulesDocumentContent }
	| { type: 'add'; newContent: RulesDocumentContent }

type FindReferences = (text: string, ruleIds: RuleIdLookup) => RuleReference[]

function documentHref(family: RulesDocumentFamilyId, version: string) {
	return family === 'core-rules' ? coreRulesLinks.document(version) : tournamentRulesLinks.document(version)
}

function sourceLabel(family: RulesDocumentFamilyId, version: string) {
	return `${family === 'core-rules' ? 'Core Rules' : 'Tournament Rules'} ${version}`
}

function ruleLabel(family: RulesDocumentFamilyId, rule: TraversedRule) {
	if (family === 'core-rules') return rule.id === null ? null : `${rule.id}.`
	return rule.label
}

function buildDocumentTree(family: RulesDocumentFamilyId, document: CompiledRulesDocument): DocumentTree {
	const roots: DocumentTreeNode[] = []
	const byAnchor = new Map<string, DocumentTreeNode>()
	let order = 0

	const append = (
		node: Omit<DocumentTreeNode, 'children' | 'parent' | 'order'>,
		parent: DocumentTreeNode | null,
	) => {
		const compiled: DocumentTreeNode = { ...node, children: [], parent, order: order++ }
		if (byAnchor.has(compiled.anchor)) {
			throw new Error(`Contextual rules comparison encountered duplicate anchor ${compiled.anchor}`)
		}
		byAnchor.set(compiled.anchor, compiled)
		if (parent) parent.children.push(compiled)
		else roots.push(compiled)
		return compiled
	}

	const appendHeading = (heading: TraversedRulesHeading, parent: DocumentTreeNode | null) =>
		append(
			{
				kind: 'heading',
				headingDepth: heading.depth,
				anchor: heading.anchor,
				label: `${heading.id}.`,
				content: [{ kind: 'paragraph', text: heading.text }],
			},
			parent,
		)

	const appendRules = (rules: readonly TraversedRule[], parent: DocumentTreeNode) => {
		for (const rule of rules) {
			const node = append(
				{
					kind: 'rule',
					anchor: rule.anchor,
					label: ruleLabel(family, rule),
					content: rule.content,
				},
				parent,
			)
			appendRules(rule.children, node)
		}
	}

	for (const section of document.sections) {
		const sectionNode = appendHeading(section.heading, null)
		for (const block of section.blocks) {
			if (block.kind === 'rules') appendRules(block.rules, sectionNode)
			else {
				const subsectionNode = appendHeading(block.heading, sectionNode)
				appendRules(block.rules, subsectionNode)
			}
		}
	}

	return { roots, byAnchor }
}

function sourceNode(merged: MergedTreeNode) {
	return merged.newNode ?? merged.oldNode
}

function oldChildrenFor(merged: MergedTreeNode | null, oldTree: DocumentTree) {
	return merged?.oldNode?.children ?? (merged === null ? oldTree.roots : [])
}

function reorderMergedChildren(
	parent: MergedTreeNode | null,
	children: MergedTreeNode[],
	oldTree: DocumentTree,
	oldToMerged: ReadonlyMap<string, MergedTreeNode>,
) {
	const ordered = children.filter(({ newNode }) => newNode !== undefined)
	const removed = children
		.filter(({ newNode }) => newNode === undefined)
		.toSorted((left, right) => left.oldNode!.order - right.oldNode!.order)
	const oldChildren = oldChildrenFor(parent, oldTree)

	for (const child of removed) {
		const oldIndex = oldChildren.indexOf(child.oldNode!)
		if (oldIndex === -1) {
			ordered.push(child)
			continue
		}

		const next = oldChildren
			.slice(oldIndex + 1)
			.map(({ anchor }) => oldToMerged.get(anchor))
			.find((candidate) => candidate !== undefined && ordered.includes(candidate))
		if (next) {
			ordered.splice(ordered.indexOf(next), 0, child)
			continue
		}

		const previous = oldChildren
			.slice(0, oldIndex)
			.toReversed()
			.map(({ anchor }) => oldToMerged.get(anchor))
			.find((candidate) => candidate !== undefined && ordered.includes(candidate))
		if (!previous) {
			ordered.push(child)
			continue
		}

		let insertionIndex = ordered.indexOf(previous) + 1
		while (
			insertionIndex < ordered.length &&
			ordered[insertionIndex].newNode === undefined &&
			ordered[insertionIndex].oldNode!.order < child.oldNode!.order
		) {
			insertionIndex++
		}
		ordered.splice(insertionIndex, 0, child)
	}

	for (const child of ordered) {
		child.children = reorderMergedChildren(child, child.children, oldTree, oldToMerged)
	}
	return ordered
}

function mergeDocumentTrees(
	oldTree: DocumentTree,
	newTree: DocumentTree,
	entries: readonly DiffEntry<RulesDiffRecord>[],
	matches: readonly RuleMatch<RulesDiffRecord>[],
) {
	const added = new Set<string>()
	const removed = new Set<string>()
	const modified = new Set<string>()
	for (const entry of entries) {
		if (entry.kind === 'added') added.add(entry.rule.anchor)
		else if (entry.kind === 'removed') removed.add(entry.rule.anchor)
		else modified.add(entry.newRule.anchor)
	}

	const alignedNewToOld = new Map(matches.map(({ oldRule, newRule }) => [newRule.anchor, oldRule.anchor]))

	const newToMerged = new Map<string, MergedTreeNode>()
	const cloneNew = (node: DocumentTreeNode): MergedTreeNode => {
		const merged: MergedTreeNode = {
			newNode: node,
			status: added.has(node.anchor) ? 'new' : modified.has(node.anchor) ? 'changed' : undefined,
			children: [],
		}
		newToMerged.set(node.anchor, merged)
		merged.children = node.children.map(cloneNew)
		return merged
	}
	let roots = newTree.roots.map(cloneNew)

	const oldToMerged = new Map<string, MergedTreeNode>()
	for (const merged of newToMerged.values()) {
		const newNode = merged.newNode!
		const alignedOldAnchor = alignedNewToOld.get(newNode.anchor)
		if (!alignedOldAnchor) continue
		const oldNode = oldTree.byAnchor.get(alignedOldAnchor)
		if (!oldNode) throw new Error(`Contextual rules comparison cannot find old anchor ${alignedOldAnchor}`)
		merged.oldNode = oldNode
		oldToMerged.set(oldNode.anchor, merged)
	}
	for (const merged of newToMerged.values()) {
		const newNode = merged.newNode!
		if (!merged.oldNode && !added.has(newNode.anchor)) {
			throw new Error(`Contextual rules comparison has no match or addition for new anchor ${newNode.anchor}`)
		}
	}
	for (const oldNode of oldTree.byAnchor.values()) {
		if (!oldToMerged.has(oldNode.anchor) && !removed.has(oldNode.anchor)) {
			throw new Error(`Contextual rules comparison has no match or removal for old anchor ${oldNode.anchor}`)
		}
	}

	const removedNodes = new Map<string, MergedTreeNode>()
	for (const oldAnchor of removed) {
		const oldNode = oldTree.byAnchor.get(oldAnchor)
		if (!oldNode) throw new Error(`Contextual rules comparison cannot find removed anchor ${oldAnchor}`)
		const merged: MergedTreeNode = { oldNode, status: 'deleted', children: [] }
		removedNodes.set(oldAnchor, merged)
		oldToMerged.set(oldAnchor, merged)
	}

	for (const merged of [...removedNodes.values()].toSorted(
		(left, right) => left.oldNode!.order - right.oldNode!.order,
	)) {
		let branch: MergedTreeNode | null = merged
		let oldParent = merged.oldNode!.parent
		while (oldParent) {
			const mergedParent = oldToMerged.get(oldParent.anchor)
			if (mergedParent) {
				mergedParent.children.push(branch)
				branch = null
				break
			}
			const context: MergedTreeNode = { oldNode: oldParent, children: [branch] }
			oldToMerged.set(oldParent.anchor, context)
			branch = context
			oldParent = oldParent.parent
		}
		if (branch) roots.push(branch)
	}

	roots = reorderMergedChildren(null, roots, oldTree, oldToMerged)
	return roots
}

function diffText(oldText: string, newText: string): TextDiffOperation[] {
	const oldTokens = indexRulesText(oldText)
	const newTokens = indexRulesText(newText)
	return alignIndicesByScore(oldTokens.length, newTokens.length, (oldIndex, newIndex) => {
		if (oldTokens[oldIndex].text !== newTokens[newIndex].text) return 0
		return isMeaningfulToken(oldTokens[oldIndex]) ? 3 : 1
	}).map((alignment): TextDiffOperation => {
		if (alignment.type === 'left') {
			return { type: 'remove', oldToken: oldTokens[alignment.leftIndex] }
		}
		if (alignment.type === 'right') {
			return { type: 'add', newToken: newTokens[alignment.rightIndex] }
		}
		return {
			type: 'same',
			oldToken: oldTokens[alignment.leftIndex],
			newToken: newTokens[alignment.rightIndex],
		}
	})
}

function referenceRanges(
	text: string,
	document: CompiledRulesDocument,
	version: string,
	family: RulesDocumentFamilyId,
	findReferences: FindReferences,
): ReferenceRange[] {
	const ruleIds: RuleIdLookup = { has: (id) => document.referenceTarget(id) !== undefined }
	const baseHref = documentHref(family, version)
	return findReferences(text, ruleIds).map((reference) => ({
		id: reference.id,
		start: reference.start,
		end: reference.end,
		href: `${baseHref}#${document.referenceTarget(reference.id)!.anchor}`,
		sourceLabel: sourceLabel(family, version),
	}))
}

function tokenReference(token: IndexedRulesTextToken, ranges: readonly ReferenceRange[]) {
	const range = ranges.find(({ start, end }) => token.start >= start && token.end <= end)
	return range ? { id: range.id, href: range.href, sourceLabel: range.sourceLabel } : undefined
}

function referenceLink(reference: ReturnType<typeof tokenReference>) {
	return reference ? { href: reference.href, sourceLabel: reference.sourceLabel } : undefined
}

function appendText(
	segments: ContextualChangeText[],
	type: ContextualChangeText['type'],
	text: string,
	reference?: Readonly<{ href: string; sourceLabel: string }>,
) {
	const previous = segments.at(-1)
	if (
		previous?.type === type &&
		previous.href === reference?.href &&
		previous.sourceLabel === reference?.sourceLabel
	) {
		segments[segments.length - 1] = { ...previous, text: previous.text + text }
	} else segments.push({ type, text, ...reference })
}

function linkedText(text: string, ranges: readonly ReferenceRange[]) {
	const segments: ContextualChangeText[] = []
	let cursor = 0
	for (const range of ranges) {
		if (range.start > cursor) appendText(segments, 'same', text.slice(cursor, range.start))
		appendText(segments, 'same', text.slice(range.start, range.end), range)
		cursor = range.end
	}
	if (cursor < text.length) appendText(segments, 'same', text.slice(cursor))
	return segments
}

function groupInlineDiffOperations(operations: readonly TextDiffOperation[]) {
	const grouped: TextDiffOperation[] = []
	let hunk: TextDiffOperation[] = []
	const flushHunk = () => {
		if (hunk.length === 0) return
		if (hunk.every(({ type }) => type === 'same')) {
			grouped.push(...hunk)
			hunk = []
			return
		}
		while (hunk[0]?.type === 'same') grouped.push(hunk.shift()!)
		const trailing: TextDiffOperation[] = []
		while (hunk.at(-1)?.type === 'same') trailing.unshift(hunk.pop()!)
		for (const operation of hunk) {
			if (operation.type === 'remove') grouped.push(operation)
			else if (operation.type === 'same') grouped.push({ type: 'remove', oldToken: operation.oldToken })
		}
		for (const operation of hunk) {
			if (operation.type === 'add') grouped.push(operation)
			else if (operation.type === 'same') grouped.push({ type: 'add', newToken: operation.newToken })
		}
		grouped.push(...trailing)
		hunk = []
	}
	for (const operation of operations) {
		if (operation.type === 'same' && isMeaningfulToken(operation.newToken)) {
			flushHunk()
			grouped.push(operation)
		} else hunk.push(operation)
	}
	flushHunk()
	return grouped
}

function inlineDiff(
	operations: readonly TextDiffOperation[],
	oldRanges: readonly ReferenceRange[],
	newRanges: readonly ReferenceRange[],
) {
	const segments: ContextualChangeText[] = []
	for (const operation of groupInlineDiffOperations(operations)) {
		if (operation.type === 'same') {
			const oldReference = tokenReference(operation.oldToken, oldRanges)
			const newReference = tokenReference(operation.newToken, newRanges)
			const sharedReference =
				oldReference && newReference && oldReference.id !== newReference.id
					? undefined
					: (newReference ?? oldReference)
			appendText(segments, 'same', operation.newToken.text, referenceLink(sharedReference))
		} else if (operation.type === 'remove') {
			appendText(
				segments,
				'remove',
				operation.oldToken.text,
				referenceLink(tokenReference(operation.oldToken, oldRanges)),
			)
		} else {
			appendText(
				segments,
				'add',
				operation.newToken.text,
				referenceLink(tokenReference(operation.newToken, newRanges)),
			)
		}
	}
	return segments
}

function isMeaningfulToken(token: IndexedRulesTextToken) {
	return !/^\s+$/u.test(token.text)
}

function contentTextsMatch(oldText: string, newText: string) {
	const operations = diffText(oldText, newText)
	let oldTokens = 0
	let newTokens = 0
	let sharedTokens = 0
	for (const operation of operations) {
		if (operation.type === 'same') {
			if (!isMeaningfulToken(operation.newToken)) continue
			oldTokens++
			newTokens++
			sharedTokens++
		} else if (operation.type === 'remove') {
			if (isMeaningfulToken(operation.oldToken)) oldTokens++
		} else if (isMeaningfulToken(operation.newToken)) newTokens++
	}
	if (oldTokens === 0 || newTokens === 0) return false
	const dice = (2 * sharedTokens) / (oldTokens + newTokens)
	const containment = sharedTokens / Math.min(oldTokens, newTokens)
	return dice >= 0.5 || containment >= 0.8
}

function alignContent(
	oldContent: readonly RulesDocumentContent[],
	newContent: readonly RulesDocumentContent[],
): ContentAlignment[] {
	return alignIndicesByScore(oldContent.length, newContent.length, (oldIndex, newIndex) => {
		const oldBlock = oldContent[oldIndex]
		const newBlock = newContent[newIndex]
		if (oldBlock.text === newBlock.text) return 6
		if (contentTextsMatch(oldBlock.text, newBlock.text)) return oldBlock.kind === newBlock.kind ? 5 : 4
		return oldBlock.kind === newBlock.kind ? 2 : 0
	}).map((alignment): ContentAlignment => {
		if (alignment.type === 'left') {
			return { type: 'remove', oldContent: oldContent[alignment.leftIndex] }
		}
		if (alignment.type === 'right') {
			return { type: 'add', newContent: newContent[alignment.rightIndex] }
		}
		return {
			type: 'aligned',
			oldContent: oldContent[alignment.leftIndex],
			newContent: newContent[alignment.rightIndex],
		}
	})
}

function prepareContent(
	merged: MergedTreeNode,
	oldDocument: CompiledRulesDocument,
	newDocument: CompiledRulesDocument,
	family: RulesDocumentFamilyId,
	from: string,
	to: string,
) {
	const findReferences = family === 'core-rules' ? findCoreRuleReferences : findTournamentRuleReferences
	const prepareBlock = (
		content: RulesDocumentContent,
		document: CompiledRulesDocument,
		version: string,
	): ContextualChangeBlock => ({
		kind: content.kind,
		text: linkedText(content.text, referenceRanges(content.text, document, version, family, findReferences)),
	})
	const prepareInlineChangeBlock = (
		content: RulesDocumentContent,
		document: CompiledRulesDocument,
		version: string,
		change: 'add' | 'remove',
	): ContextualChangeBlock => {
		const block = prepareBlock(content, document, version)
		return {
			...block,
			text: block.text.map((segment) =>
				segment.href
					? { type: change, text: segment.text, href: segment.href, sourceLabel: segment.sourceLabel }
					: { type: change, text: segment.text },
			),
		}
	}

	if (merged.status !== 'changed') {
		const node = sourceNode(merged)!
		const usesOldSource = merged.newNode === undefined
		const document = usesOldSource ? oldDocument : newDocument
		const version = usesOldSource ? from : to
		return node.content.map((content) => prepareBlock(content, document, version))
	}

	return alignContent(merged.oldNode!.content, merged.newNode!.content).flatMap(
		(alignment): ContextualChangeBlock[] => {
			if (alignment.type === 'remove') {
				return [prepareInlineChangeBlock(alignment.oldContent, oldDocument, from, 'remove')]
			}
			if (alignment.type === 'add') {
				return [prepareInlineChangeBlock(alignment.newContent, newDocument, to, 'add')]
			}
			const oldRanges = referenceRanges(alignment.oldContent.text, oldDocument, from, family, findReferences)
			const newRanges = referenceRanges(alignment.newContent.text, newDocument, to, family, findReferences)
			if (alignment.oldContent.text === alignment.newContent.text) {
				return [
					{
						kind: alignment.newContent.kind,
						text: linkedText(alignment.newContent.text, newRanges),
					},
				]
			}
			const operations = diffText(alignment.oldContent.text, alignment.newContent.text)
			return [
				{
					kind: alignment.newContent.kind,
					text: inlineDiff(operations, oldRanges, newRanges),
				},
			]
		},
	)
}

export function prepareContextualRulesChange(
	catalog: RulesDocumentFamilyCatalog,
	change: PreparedRulesChange,
): ContextualRulesChange {
	const family = catalog.currentVersion.type
	const oldDocument = catalog.get(change.from.version)
	const newDocument = catalog.get(change.to.version)
	const oldTree = buildDocumentTree(family, oldDocument)
	const newTree = buildDocumentTree(family, newDocument)
	const entries = catalog.difference(change.from.version, change.to.version)
	const mergedRoots = mergeDocumentTrees(
		oldTree,
		newTree,
		entries,
		catalog.matches(change.from.version, change.to.version),
	)
	let affectedNodes = 0

	const prepareNode = (merged: MergedTreeNode): ContextualChangeNode | null => {
		const children = merged.children
			.map((child) => prepareNode(child))
			.filter((child): child is ContextualChangeNode => child !== null)
		if (!merged.status && children.length === 0) return null

		const node = sourceNode(merged)!
		if (merged.status) affectedNodes++

		const usesOldSource = merged.newNode === undefined
		const version = usesOldSource ? change.from.version : change.to.version
		return {
			kind: node.kind,
			...(node.headingDepth ? { headingDepth: node.headingDepth } : {}),
			key: `${usesOldSource ? 'old' : 'new'}:${node.anchor}`,
			label: node.label,
			href: `${documentHref(family, version)}#${node.anchor}`,
			sourceLabel: sourceLabel(family, version),
			...(merged.status ? { status: merged.status } : {}),
			content: prepareContent(
				merged,
				oldDocument,
				newDocument,
				family,
				change.from.version,
				change.to.version,
			),
			children,
		}
	}

	const items = mergedRoots
		.map((root) => prepareNode(root))
		.filter((item): item is ContextualChangeNode => item !== null)

	if (affectedNodes !== entries.length) {
		throw new Error(
			`Contextual rules comparison prepared ${affectedNodes} affected nodes for ${entries.length} changes`,
		)
	}

	return { items }
}
