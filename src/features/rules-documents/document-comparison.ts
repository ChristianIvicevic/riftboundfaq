import { measureRulesTextSimilarity, rulesLexicalTokens } from '@/features/rules-documents/text-similarity'
import type { RulesDocumentContent } from '@/lib/rules/document-types'

export type RulesDiffRecord = Readonly<{
	id: string | null
	content: readonly RulesDocumentContent[]
	anchor: string
	parentAnchor: string | null
	kind: 'heading' | 'rule'
	headingDepth?: 2 | 3
}>

export type RulesComparisonEntry =
	| Readonly<{ kind: 'added'; rule: RulesDiffRecord }>
	| Readonly<{ kind: 'removed'; rule: RulesDiffRecord }>
	| Readonly<{ kind: 'modified'; oldRule: RulesDiffRecord; newRule: RulesDiffRecord }>

export type RulesNodeMatch = Readonly<{
	oldRule: RulesDiffRecord
	newRule: RulesDiffRecord
}>

export type RulesDocumentComparison = Readonly<{
	entries: readonly RulesComparisonEntry[]
	matches: readonly RulesNodeMatch[]
}>

type ReferenceSyntax = 'generic' | 'tournament'

type IndexedDocument = Readonly<{
	records: readonly RulesDiffRecord[]
	byAnchor: ReadonlyMap<string, RulesDiffRecord>
	children: ReadonlyMap<string | null, readonly RulesDiffRecord[]>
	order: ReadonlyMap<string, number>
	normalizedText: ReadonlyMap<string, string>
	contentSignature: ReadonlyMap<string, string>
	textSignature: ReadonlyMap<string, string>
	subtreeSignature: ReadonlyMap<string, string>
}>

type MatchCandidate = Readonly<{
	oldRule: RulesDiffRecord
	newRule: RulesDiffRecord
	rank: readonly number[]
}>

const RULE_ID = /\d{3}(?:\.[0-9a-z]+)*/giu
const GENERIC_RULE_REFERENCE = /\brules?\s+\d{3}(?:\.[0-9a-z]+)*/giu
const TOURNAMENT_CR_REFERENCE = /\bCR\s+\d{3}(?:\.[0-9a-z]+)*/giu
const TOURNAMENT_CUED_REFERENCE =
	/\b(?:see(?:\s+rule)?|section|steps?|proceed to|process of|described in|except for|perform|listed (?:under|in)|qualifies for|meets?)\s+\d{3}(?:\.[0-9a-z]+)*(?:\.?\s*(?:-|–|—|and|or)\s*\d{3}(?:\.[0-9a-z]+)*)*/giu

const maskIds = (reference: string) => reference.replaceAll(RULE_ID, 'rule#')

function maskRuleReferences(text: string, syntax: ReferenceSyntax) {
	const masked = text.replaceAll(GENERIC_RULE_REFERENCE, maskIds)
	if (syntax === 'generic') return masked
	return masked.replaceAll(TOURNAMENT_CR_REFERENCE, maskIds).replaceAll(TOURNAMENT_CUED_REFERENCE, maskIds)
}

function normalizeText(text: string) {
	return text.replaceAll(/\s+/gu, ' ').trim()
}

function textWithoutLeadingOrdinal(text: string) {
	return text.match(/^\d+\.\s+(.+)$/u)?.[1] ?? null
}

function canMatch(oldRule: RulesDiffRecord, newRule: RulesDiffRecord) {
	return oldRule.kind === newRule.kind && oldRule.headingDepth === newRule.headingDepth
}

function indexDocument(records: readonly RulesDiffRecord[]): IndexedDocument {
	const byAnchor = new Map(records.map((record) => [record.anchor, record]))
	const children = Map.groupBy(records, ({ parentAnchor }) => parentAnchor)
	const order = new Map(records.map((record, index) => [record.anchor, index]))
	const normalizedText = new Map(
		records.map((record) => [record.anchor, normalizeText(record.content.map(({ text }) => text).join(' '))]),
	)
	const contentSignature = new Map(
		records.map((record) => [
			record.anchor,
			JSON.stringify([
				record.kind,
				record.headingDepth ?? null,
				record.content.map(({ kind, text }) => [kind, normalizeText(text)]),
			]),
		]),
	)
	const textSignature = new Map(
		records.map((record) => [
			record.anchor,
			JSON.stringify([
				record.kind,
				record.headingDepth ?? null,
				record.content.map(({ text }) => normalizeText(text)),
			]),
		]),
	)
	const subtreeSignature = new Map<string, string>()
	const prepareSubtreeSignature = (record: RulesDiffRecord): string => {
		const existing = subtreeSignature.get(record.anchor)
		if (existing) return existing
		const prepared = JSON.stringify([
			contentSignature.get(record.anchor),
			(children.get(record.anchor) ?? []).map((child) => prepareSubtreeSignature(child)),
		])
		subtreeSignature.set(record.anchor, prepared)
		return prepared
	}
	for (const record of records) prepareSubtreeSignature(record)

	return {
		records,
		byAnchor,
		children,
		order,
		normalizedText,
		contentSignature,
		textSignature,
		subtreeSignature,
	}
}

function groupUnmatchedBySignature(
	document: IndexedDocument,
	matched: ReadonlyMap<string, RulesDiffRecord>,
	signatures: ReadonlyMap<string, string>,
) {
	const grouped = new Map<string, RulesDiffRecord[]>()
	for (const record of document.records) {
		if (matched.has(record.anchor)) continue
		const signature = signatures.get(record.anchor)!
		const group = grouped.get(signature)
		if (group) group.push(record)
		else grouped.set(signature, [record])
	}
	return grouped
}

function compareMatchRanks(left: readonly number[], right: readonly number[]) {
	for (let index = 0; index < Math.max(left.length, right.length); index++) {
		const difference = (left[index] ?? 0) - (right[index] ?? 0)
		if (difference !== 0) return difference
	}
	return 0
}

const parentMatchRank = (directChildren: number, textEvidence: number) =>
	[directChildren, textEvidence] as const

const childMatchRank = (contentEvidence: number, neighborEvidence: number, sameId: boolean) =>
	[contentEvidence, neighborEvidence, Number(sameId)] as const

function uniqueBestCandidates(candidates: readonly MatchCandidate[]) {
	const byOld = Map.groupBy(candidates, ({ oldRule }) => oldRule.anchor)
	const byNew = Map.groupBy(candidates, ({ newRule }) => newRule.anchor)
	const uniqueBest = (group: readonly MatchCandidate[], rank: readonly number[]) => {
		let best: readonly number[] | undefined
		let occurrences = 0
		for (const candidate of group) {
			const comparison = best === undefined ? 1 : compareMatchRanks(candidate.rank, best)
			if (comparison > 0) {
				best = candidate.rank
				occurrences = 1
			} else if (comparison === 0) occurrences++
		}
		return best !== undefined && compareMatchRanks(best, rank) === 0 && occurrences === 1
	}

	return candidates.filter(
		(candidate) =>
			uniqueBest(byOld.get(candidate.oldRule.anchor)!, candidate.rank) &&
			uniqueBest(byNew.get(candidate.newRule.anchor)!, candidate.rank),
	)
}

function entryOrder(entry: RulesComparisonEntry, oldDocument: IndexedDocument, newDocument: IndexedDocument) {
	if (entry.kind === 'added') return newDocument.order.get(entry.rule.anchor)!
	if (entry.kind === 'removed') return oldDocument.order.get(entry.rule.anchor)!
	return Math.min(oldDocument.order.get(entry.oldRule.anchor)!, newDocument.order.get(entry.newRule.anchor)!)
}

function accountComparisonNode(counts: Map<string, number>, anchor: string, side: 'old' | 'new') {
	const count = counts.get(anchor)
	if (count === undefined) {
		throw new Error(`Rules comparison invariant failed: unknown ${side} anchor ${anchor}`)
	}
	counts.set(anchor, count + 1)
}

function matchPairKey(oldRule: RulesDiffRecord, newRule: RulesDiffRecord) {
	return `${oldRule.anchor}\0${newRule.anchor}`
}

function assertComparisonInvariants(
	oldRecords: readonly RulesDiffRecord[],
	newRecords: readonly RulesDiffRecord[],
	matches: readonly RulesNodeMatch[],
	entries: readonly RulesComparisonEntry[],
	contentChanged: (oldRule: RulesDiffRecord, newRule: RulesDiffRecord) => boolean,
) {
	const prepareCounts = (records: readonly RulesDiffRecord[], side: 'old' | 'new') => {
		const counts = new Map<string, number>()
		for (const record of records) {
			if (counts.has(record.anchor)) {
				throw new Error(`Rules comparison invariant failed: duplicate ${side} anchor ${record.anchor}`)
			}
			counts.set(record.anchor, 0)
		}
		return counts
	}
	const oldCounts = prepareCounts(oldRecords, 'old')
	const newCounts = prepareCounts(newRecords, 'new')
	const matchedPairs = new Set<string>()
	for (const { oldRule, newRule } of matches) {
		accountComparisonNode(oldCounts, oldRule.anchor, 'old')
		accountComparisonNode(newCounts, newRule.anchor, 'new')
		matchedPairs.add(matchPairKey(oldRule, newRule))
	}
	const modifiedPairs = new Set<string>()
	for (const entry of entries) {
		if (entry.kind === 'removed') accountComparisonNode(oldCounts, entry.rule.anchor, 'old')
		else if (entry.kind === 'added') accountComparisonNode(newCounts, entry.rule.anchor, 'new')
		else {
			const key = matchPairKey(entry.oldRule, entry.newRule)
			if (!matchedPairs.has(key) || modifiedPairs.has(key)) {
				throw new Error(`Rules comparison invariant failed: invalid modified pair ${key}`)
			}
			modifiedPairs.add(key)
		}
	}
	for (const [anchor, count] of oldCounts) {
		if (count !== 1) {
			throw new Error(`Rules comparison invariant failed: old anchor ${anchor} accounted ${count} times`)
		}
	}
	for (const [anchor, count] of newCounts) {
		if (count !== 1) {
			throw new Error(`Rules comparison invariant failed: new anchor ${anchor} accounted ${count} times`)
		}
	}
	for (const { oldRule, newRule } of matches) {
		if (contentChanged(oldRule, newRule) !== modifiedPairs.has(matchPairKey(oldRule, newRule))) {
			throw new Error(
				`Rules comparison invariant failed: incorrect modification state for ${matchPairKey(oldRule, newRule)}`,
			)
		}
	}
}

export function compareRulesDocuments(
	oldRecords: readonly RulesDiffRecord[],
	newRecords: readonly RulesDiffRecord[],
	referenceSyntax: ReferenceSyntax,
): RulesDocumentComparison {
	const oldDocument = indexDocument(oldRecords)
	const newDocument = indexDocument(newRecords)
	const oldToNew = new Map<string, RulesDiffRecord>()
	const newToOld = new Map<string, RulesDiffRecord>()

	const commitMatch = (oldRule: RulesDiffRecord, newRule: RulesDiffRecord) => {
		if (oldToNew.has(oldRule.anchor) || newToOld.has(newRule.anchor) || !canMatch(oldRule, newRule)) {
			return false
		}
		oldToNew.set(oldRule.anchor, newRule)
		newToOld.set(newRule.anchor, oldRule)
		return true
	}

	const parentsMatch = (oldRule: RulesDiffRecord, newRule: RulesDiffRecord) => {
		if (oldRule.parentAnchor === null || newRule.parentAnchor === null) {
			return oldRule.parentAnchor === newRule.parentAnchor
		}
		return oldToNew.get(oldRule.parentAnchor)?.anchor === newRule.parentAnchor
	}
	const parentsMovedWithinCorrespondingAncestors = (oldRule: RulesDiffRecord, newRule: RulesDiffRecord) => {
		if (oldRule.parentAnchor === null || newRule.parentAnchor === null) return false
		const oldParent = oldDocument.byAnchor.get(oldRule.parentAnchor)!
		const newParent = newDocument.byAnchor.get(newRule.parentAnchor)!
		return (
			oldToNew.has(oldParent.anchor) && newToOld.has(newParent.anchor) && parentsMatch(oldParent, newParent)
		)
	}

	const matchUniqueSignatures = (
		oldSignatures: ReadonlyMap<string, string>,
		newSignatures: ReadonlyMap<string, string>,
		acceptSignatureMatch: (oldRule: RulesDiffRecord, newRule: RulesDiffRecord) => boolean,
	) => {
		const oldGroups = groupUnmatchedBySignature(oldDocument, oldToNew, oldSignatures)
		const newGroups = groupUnmatchedBySignature(newDocument, newToOld, newSignatures)
		let matched = 0
		for (const [signature, oldGroup] of oldGroups) {
			const newGroup = newGroups.get(signature)
			if (oldGroup.length !== 1 || newGroup?.length !== 1) continue
			const oldRule = oldGroup[0]
			const newRule = newGroup[0]
			if (acceptSignatureMatch(oldRule, newRule) && commitMatch(oldRule, newRule)) matched++
		}
		return matched
	}

	const hasChildren = (record: RulesDiffRecord, document: IndexedDocument) =>
		(document.children.get(record.anchor)?.length ?? 0) > 0
	const hasMeaningfulExactContent = (oldRule: RulesDiffRecord, newRule: RulesDiffRecord) => {
		if (!canMatch(oldRule, newRule)) return false
		const lexicalTokens = rulesLexicalTokens(oldDocument.normalizedText.get(oldRule.anchor)!).length
		return (
			parentsMatch(oldRule, newRule) ||
			lexicalTokens >= 4 ||
			(oldRule.id !== null && oldRule.id === newRule.id && lexicalTokens >= 2)
		)
	}

	matchUniqueSignatures(
		oldDocument.subtreeSignature,
		newDocument.subtreeSignature,
		(oldRule, newRule) =>
			canMatch(oldRule, newRule) &&
			(hasChildren(oldRule, oldDocument) ||
				hasChildren(newRule, newDocument) ||
				hasMeaningfulExactContent(oldRule, newRule)),
	)
	matchUniqueSignatures(oldDocument.contentSignature, newDocument.contentSignature, hasMeaningfulExactContent)

	const textEvidence = (oldRule: RulesDiffRecord, newRule: RulesDiffRecord) => {
		const oldText = oldDocument.normalizedText.get(oldRule.anchor)!
		const newText = newDocument.normalizedText.get(newRule.anchor)!
		if (oldDocument.textSignature.get(oldRule.anchor) === newDocument.textSignature.get(newRule.anchor)) {
			return { tier: 5, ...measureRulesTextSimilarity(oldText, newText) }
		}
		const oldWithoutOrdinal = textWithoutLeadingOrdinal(oldText)
		const newWithoutOrdinal = textWithoutLeadingOrdinal(newText)
		if (oldWithoutOrdinal !== null && oldWithoutOrdinal === newWithoutOrdinal) {
			return { tier: 4, ...measureRulesTextSimilarity(oldText, newText) }
		}
		if (maskRuleReferences(oldText, referenceSyntax) === maskRuleReferences(newText, referenceSyntax)) {
			return { tier: 3, ...measureRulesTextSimilarity(oldText, newText) }
		}
		const similarity = measureRulesTextSimilarity(oldText, newText)
		return {
			tier: similarity.sharedTokens >= 1 && similarity.dice >= 0.6 ? 2 : 0,
			...similarity,
		}
	}

	const acceptCandidates = (candidates: readonly MatchCandidate[]) => {
		let matched = 0
		for (const candidate of uniqueBestCandidates(candidates).toSorted(
			(left, right) =>
				oldDocument.order.get(left.oldRule.anchor)! - oldDocument.order.get(right.oldRule.anchor)!,
		)) {
			if (commitMatch(candidate.oldRule, candidate.newRule)) matched++
		}
		return matched
	}

	const matchParentsFromChildren = () => {
		const pairs = new Map<
			string,
			{ oldRule: RulesDiffRecord; newRule: RulesDiffRecord; directChildren: number }
		>()
		for (const [oldAnchor, newRule] of oldToNew) {
			const oldRule = oldDocument.byAnchor.get(oldAnchor)!
			if (oldRule.parentAnchor === null || newRule.parentAnchor === null) continue
			const oldParent = oldDocument.byAnchor.get(oldRule.parentAnchor)!
			const newParent = newDocument.byAnchor.get(newRule.parentAnchor)!
			if (
				oldToNew.has(oldParent.anchor) ||
				newToOld.has(newParent.anchor) ||
				!canMatch(oldParent, newParent)
			) {
				continue
			}
			const key = matchPairKey(oldParent, newParent)
			const pair = pairs.get(key)
			if (pair) pair.directChildren++
			else pairs.set(key, { oldRule: oldParent, newRule: newParent, directChildren: 1 })
		}

		const candidates: MatchCandidate[] = []
		for (const { oldRule, newRule, directChildren } of pairs.values()) {
			const evidence = textEvidence(oldRule, newRule)
			const sameId = oldRule.id !== null && oldRule.id === newRule.id ? 1 : 0
			if (directChildren < 2 && evidence.tier < 2 && sameId === 0) continue
			candidates.push({
				oldRule,
				newRule,
				rank: parentMatchRank(directChildren, evidence.tier),
			})
		}
		return acceptCandidates(candidates)
	}

	const childMatchEvidence = (
		oldRule: RulesDiffRecord,
		newRule: RulesDiffRecord,
		neighborEvidence: number,
	) => {
		const oldContent = oldDocument.contentSignature.get(oldRule.anchor)
		const newContent = newDocument.contentSignature.get(newRule.anchor)
		const sameId = oldRule.id !== null && oldRule.id === newRule.id
		if (oldContent === newContent) return { tier: 6 }
		const evidence = textEvidence(oldRule, newRule)
		const balancedShortText = evidence.shorterTokenCount >= 4 || evidence.lengthRatio > 0.5
		if (evidence.tier >= 3) return { tier: evidence.tier + 1 }
		if (evidence.sharedTokens >= 4 && evidence.dice >= 0.7) {
			return { tier: 3 }
		}
		if (sameId && evidence.sharedTokens >= 2 && evidence.dice >= 0.5 && balancedShortText) {
			return { tier: 2 }
		}
		if (
			neighborEvidence > 0 &&
			evidence.sharedTokens >= 2 &&
			evidence.dice >= 0.45 &&
			(balancedShortText || neighborEvidence === 2)
		) {
			return { tier: 2 }
		}
	}

	const matchChildren = () => {
		const parentPairs: ReadonlyArray<readonly [string | null, string | null]> = [
			[null, null],
			...[...oldToNew].map(([oldAnchor, newRule]) => [oldAnchor, newRule.anchor] as const),
		]
		const candidates: MatchCandidate[] = []
		for (const [oldParent, newParent] of parentPairs) {
			const allOldChildren = oldDocument.children.get(oldParent) ?? []
			const allNewChildren = newDocument.children.get(newParent) ?? []
			const oldChildren = allOldChildren.filter(({ anchor }) => !oldToNew.has(anchor))
			const newChildren = allNewChildren.filter(({ anchor }) => !newToOld.has(anchor))
			for (const oldRule of oldChildren) {
				for (const newRule of newChildren) {
					if (!canMatch(oldRule, newRule)) continue
					const oldIndex = allOldChildren.indexOf(oldRule)
					const newIndex = allNewChildren.indexOf(newRule)
					const previousCorresponds = allOldChildren
						.slice(0, oldIndex)
						.toReversed()
						.some(({ anchor }) => {
							const match = oldToNew.get(anchor)
							return match !== undefined && allNewChildren.indexOf(match) < newIndex
						})
					const nextCorresponds = allOldChildren.slice(oldIndex + 1).some(({ anchor }) => {
						const match = oldToNew.get(anchor)
						return match !== undefined && allNewChildren.indexOf(match) > newIndex
					})
					const neighborEvidence = Number(previousCorresponds) + Number(nextCorresponds)
					const evidence = childMatchEvidence(oldRule, newRule, neighborEvidence)
					if (!evidence) continue
					candidates.push({
						oldRule,
						newRule,
						rank: childMatchRank(
							evidence.tier,
							neighborEvidence,
							evidence.tier === 6 && oldRule.id !== null && oldRule.id === newRule.id,
						),
					})
				}
			}
		}
		return acceptCandidates(candidates)
	}

	let progress: number
	do {
		progress = 0
		progress += matchParentsFromChildren()
		progress += matchChildren()
		progress += matchUniqueSignatures(
			oldDocument.contentSignature,
			newDocument.contentSignature,
			(oldRule, newRule) =>
				hasMeaningfulExactContent(oldRule, newRule) &&
				(parentsMatch(oldRule, newRule) || parentsMovedWithinCorrespondingAncestors(oldRule, newRule)),
		)
	} while (progress > 0)

	const matches = [...oldToNew]
		.map(([oldAnchor, newRule]) => Object.freeze({ oldRule: oldDocument.byAnchor.get(oldAnchor)!, newRule }))
		.toSorted(
			(left, right) =>
				oldDocument.order.get(left.oldRule.anchor)! - oldDocument.order.get(right.oldRule.anchor)!,
		)

	const contentChanged = (oldRule: RulesDiffRecord, newRule: RulesDiffRecord) =>
		oldDocument.contentSignature.get(oldRule.anchor) !== newDocument.contentSignature.get(newRule.anchor)

	const entries: RulesComparisonEntry[] = []
	for (const newRule of newRecords) {
		const oldRule = newToOld.get(newRule.anchor)
		if (!oldRule) entries.push(Object.freeze({ kind: 'added', rule: newRule }))
		else if (contentChanged(oldRule, newRule)) {
			entries.push(Object.freeze({ kind: 'modified', oldRule, newRule }))
		}
	}
	for (const oldRule of oldRecords) {
		if (!oldToNew.has(oldRule.anchor)) entries.push(Object.freeze({ kind: 'removed', rule: oldRule }))
	}
	entries.sort((left, right) => {
		const order = entryOrder(left, oldDocument, newDocument) - entryOrder(right, oldDocument, newDocument)
		if (order !== 0) return order
		if (left.kind === 'modified') return 1
		if (right.kind === 'modified') return -1
		return left.kind.localeCompare(right.kind)
	})
	assertComparisonInvariants(oldRecords, newRecords, matches, entries, contentChanged)

	return Object.freeze({ entries: Object.freeze(entries), matches: Object.freeze(matches) })
}
