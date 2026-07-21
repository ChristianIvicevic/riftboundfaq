import type { RuleRecord } from '@/components/rules/types'

export type TokenType = 'same' | 'add' | 'remove'
export type Token = { type: TokenType; text: string }

/**
 * A single row in a rendered diff between two rule sets.
 * - `added`   — rule exists only in the new version.
 * - `removed` — rule exists only in the old version.
 * - `modified` — rule exists in both but its text changed; `oldText`/`newText` hold the inline
 *   token diff for the left (old) and right (new) columns, labelled `oldId`/`newId` (which differ
 *   when the rule was renumbered). Each rule is diffed as one continuous line, so source line breaks
 *   (e.g. an example moved onto its own line) are not treated as edits.
 */
export type DiffEntry =
	| { kind: 'added'; rule: RuleRecord }
	| { kind: 'removed'; rule: RuleRecord }
	| { kind: 'modified'; oldId: string; newId: string; oldText: Token[]; newText: Token[] }

export type DiffOptions = {
	hideRenumbering?: boolean
	hideReferenceOnlyChanges?: boolean
	prioritizeTextSimilarity?: boolean
}

type Op<T> = { type: TokenType; value: T }

/** Longest-common-subsequence diff of two sequences, returned as an ordered op list. */
function diffSequence<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean): Op<T>[] {
	const n = a.length
	const m = b.length
	// dp[i][j] = LCS length of a[i:] and b[j:]
	const dp: Int32Array[] = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			dp[i][j] = eq(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
		}
	}

	const ops: Op<T>[] = []
	let i = 0
	let j = 0
	while (i < n && j < m) {
		if (eq(a[i], b[j])) {
			ops.push({ type: 'same', value: a[i] })
			i++
			j++
		} else if (dp[i + 1][j] >= dp[i][j + 1]) {
			ops.push({ type: 'remove', value: a[i] })
			i++
		} else {
			ops.push({ type: 'add', value: b[j] })
			j++
		}
	}
	while (i < n) ops.push({ type: 'remove', value: a[i++] })
	while (j < m) ops.push({ type: 'add', value: b[j++] })
	return ops
}

/** Split text into a token stream of words, whitespace runs, and single punctuation characters. */
function tokenize(text: string): string[] {
	return text.match(/\s+|[\p{L}\p{N}​]+|[^\p{L}\p{N}\s]/gu) ?? []
}

/** Collapse adjacent tokens of the same type and drop empties. */
function mergeTokens(tokens: Token[]): Token[] {
	const out: Token[] = []
	for (const token of tokens) {
		if (!token.text) continue
		const last = out.at(-1)
		if (last && last.type === token.type) last.text += token.text
		else out.push({ ...token })
	}
	return out
}

/** Move any leading/trailing whitespace out of change tokens so highlights don't include edge spaces. */
function trimHighlightEdges(tokens: Token[]): Token[] {
	const out: Token[] = []
	for (const token of tokens) {
		if (token.type === 'same') {
			out.push(token)
			continue
		}
		const leading = token.text.match(/^\s+/u)?.[0] ?? ''
		const trailing = token.text.slice(leading.length).match(/\s+$/u)?.[0] ?? ''
		const core = token.text.slice(leading.length, token.text.length - trailing.length)
		if (leading) out.push({ type: 'same', text: leading })
		if (core) out.push({ type: token.type, text: core })
		if (trailing) out.push({ type: 'same', text: trailing })
	}
	return mergeTokens(out)
}

/**
 * Project a word-level diff onto one column: keep unchanged (`same`) tokens plus this column's own
 * change tokens. Whitespace sitting between two changed words is pulled into the change, so a
 * multi-word edit renders as one continuous highlight rather than separate word-by-word ones (shared
 * punctuation between changed words is left unhighlighted, keeping the highlight honest).
 */
function sideTokens(ops: Op<string>[], change: 'remove' | 'add'): Token[] {
	const tokens: Token[] = ops
		.filter((op) => op.type === 'same' || op.type === change)
		.map((op) => ({ type: op.type, text: op.value }))
	for (let i = 1; i < tokens.length - 1; i++) {
		const token = tokens[i]
		const bridges = tokens[i - 1].type === change && tokens[i + 1].type === change
		if (token.type === 'same' && bridges && /^\s+$/u.test(token.text)) token.type = change
	}
	return trimHighlightEdges(mergeTokens(tokens))
}

/** Build a modified entry: word-level diff of the two rules' joined text. */
function buildModified(oldId: string, newId: string, oldLines: string[], newLines: string[]): DiffEntry {
	const ops = diffSequence(tokenize(oldLines.join(' ')), tokenize(newLines.join(' ')), (x, y) => x === y)
	return {
		kind: 'modified',
		oldId,
		newId,
		oldText: sideTokens(ops, 'remove'),
		newText: sideTokens(ops, 'add'),
	}
}

/**
 * Two non-identical rules are treated as the same rule (a modification) when either measure over
 * their word-level LCS clears its threshold; otherwise they are reported as an independent removal
 * + addition. `SIMILARITY` (Dice) handles balanced edits; `CONTAINMENT` (LCS over the shorter rule)
 * handles asymmetric ones, e.g. a short rule that gained a long example. Tunable; mispairs are only
 * cosmetic.
 */
const SIMILARITY_THRESHOLD = 0.5
const CONTAINMENT_THRESHOLD = 0.8

/** A rule's text as a single normalized string, used for content matching. */
function normalizedText(rule: RuleRecord): string {
	return rule.lines.join(' ').replaceAll(/\s+/gu, ' ').trim()
}

/** Rule cross-references such as "rule 481" or "rules 103.2.a". */
const RULE_REFERENCE = /\brules?\s+\d{3}(?:\.[0-9a-z]+)*/giu

/**
 * Replace rule-number references with a placeholder. A rule whose only change is such a reference
 * (e.g. "See rule 476" → "See rule 481" because the referenced rule itself was renumbered) then
 * compares equal, so it can be treated as noise rather than a content change.
 */
function maskRuleReferences(text: string): string {
	return text.replaceAll(RULE_REFERENCE, 'rule#')
}

function splitWords(text: string): string[] {
	return text.split(/\s+/u).filter(Boolean)
}

/** Length of the longest common subsequence, computed with O(m) memory. */
function lcsLength<T>(a: T[], b: T[]): number {
	let prev = new Int32Array(b.length + 1)
	for (let i = a.length - 1; i >= 0; i--) {
		const cur = new Int32Array(b.length + 1)
		for (let j = b.length - 1; j >= 0; j--) {
			cur[j] = a[i] === b[j] ? prev[j + 1] + 1 : Math.max(prev[j], cur[j + 1])
		}
		prev = cur
	}
	return prev[0]
}

/**
 * Whether two rule texts are similar enough to be the same (edited) rule. Computes the word LCS
 * once, then accepts on Dice similarity (balanced edits) or containment — how much of the shorter
 * rule survives in the longer (asymmetric edits, e.g. an appended example).
 */
function textsMatch(a: string, b: string): boolean {
	const aWords = splitWords(a)
	const bWords = splitWords(b)
	if (aWords.length === 0 || bWords.length === 0) return aWords.length === bWords.length
	const lcs = lcsLength(aWords, bWords)
	const dice = (2 * lcs) / (aWords.length + bWords.length)
	const containment = lcs / Math.min(aWords.length, bWords.length)
	return dice >= SIMILARITY_THRESHOLD || containment >= CONTAINMENT_THRESHOLD
}

type AlignOp =
	| { type: 'same'; oldIndex: number; newIndex: number }
	| { type: 'remove'; oldIndex: number }
	| { type: 'add'; newIndex: number }

/** Order-preserving alignment that prefers matches with higher scores. Zero means no match. */
function alignIndicesByScore(n: number, m: number, score: (i: number, j: number) => number): AlignOp[] {
	const dp: Int32Array[] = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			const matchScore = score(i, j)
			dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1], matchScore > 0 ? dp[i + 1][j + 1] + matchScore : 0)
		}
	}
	const ops: AlignOp[] = []
	let i = 0
	let j = 0
	while (i < n && j < m) {
		const matchScore = score(i, j)
		if (matchScore > 0 && dp[i][j] === dp[i + 1][j + 1] + matchScore) {
			ops.push({ type: 'same', oldIndex: i, newIndex: j })
			i++
			j++
		} else if (dp[i + 1][j] >= dp[i][j + 1]) {
			ops.push({ type: 'remove', oldIndex: i })
			i++
		} else {
			ops.push({ type: 'add', newIndex: j })
			j++
		}
	}
	while (i < n) ops.push({ type: 'remove', oldIndex: i++ })
	while (j < m) ops.push({ type: 'add', newIndex: j++ })
	return ops
}

/** Longest-common-subsequence alignment under an arbitrary equality predicate. */
function alignIndices(n: number, m: number, eq: (i: number, j: number) => boolean): AlignOp[] {
	return alignIndicesByScore(n, m, (i, j) => (eq(i, j) ? 1 : 0))
}

/**
 * Diff two ordered rule sets by **content**. By default, rules that were only renumbered and rules
 * changed only by a `rule N` reference are omitted. Callers can retain either category. Remaining
 * gaps are re-aligned by similarity (and, with the default behavior, matching IDs): matched rules
 * become modifications, while the rest are genuine additions/removals. Document order is preserved.
 */
export function diffRuleSets(
	oldRules: RuleRecord[],
	newRules: RuleRecord[],
	{
		hideRenumbering = true,
		hideReferenceOnlyChanges = true,
		prioritizeTextSimilarity = false,
	}: DiffOptions = {},
): DiffEntry[] {
	const oldText = oldRules.map((rule) => normalizedText(rule))
	const newText = newRules.map((rule) => normalizedText(rule))

	const entries: DiffEntry[] = []
	let gapOld: number[] = []
	let gapNew: number[] = []

	const flushGap = () => {
		if (gapOld.length === 0 && gapNew.length === 0) return
		const matchScore = (i: number, j: number) => {
			const oldRule = oldRules[gapOld[i]]
			const newRule = newRules[gapNew[j]]
			if (textsMatch(oldText[gapOld[i]], newText[gapNew[j]])) return 2
			return oldRule.id === newRule.id ? 1 : 0
		}
		const gapOps = prioritizeTextSimilarity
			? alignIndicesByScore(gapOld.length, gapNew.length, matchScore)
			: alignIndices(gapOld.length, gapNew.length, (i, j) => matchScore(i, j) > 0)
		for (const op of gapOps) {
			if (op.type === 'remove') {
				entries.push({ kind: 'removed', rule: oldRules[gapOld[op.oldIndex]] })
			} else if (op.type === 'add') {
				entries.push({ kind: 'added', rule: newRules[gapNew[op.newIndex]] })
			} else {
				const oldRule = oldRules[gapOld[op.oldIndex]]
				const newRule = newRules[gapNew[op.newIndex]]
				const oldNorm = oldText[gapOld[op.oldIndex]]
				const newNorm = newText[gapNew[op.newIndex]]
				// Identical text is just a renumber. A change limited to referenced rule numbers is
				// likewise noise (the referenced rule moved, not this one's meaning) by default.
				if (oldNorm === newNorm && (oldRule.id === newRule.id || hideRenumbering)) continue
				if (
					oldNorm !== newNorm &&
					hideReferenceOnlyChanges &&
					(oldRule.id === newRule.id || hideRenumbering) &&
					maskRuleReferences(oldNorm) === maskRuleReferences(newNorm)
				) {
					continue
				}
				entries.push(buildModified(oldRule.id, newRule.id, oldRule.lines, newRule.lines))
			}
		}
		gapOld = []
		gapNew = []
	}

	// Exact text remains the stable alignment anchor even when a renumbering should be displayed.
	const anchorOps = alignIndices(oldRules.length, newRules.length, (i, j) => oldText[i] === newText[j])
	for (const op of anchorOps) {
		if (op.type === 'remove') {
			gapOld.push(op.oldIndex)
		} else if (op.type === 'add') {
			gapNew.push(op.newIndex)
		} else {
			flushGap()
			const oldRule = oldRules[op.oldIndex]
			const newRule = newRules[op.newIndex]
			if (!hideRenumbering && oldRule.id !== newRule.id) {
				entries.push(buildModified(oldRule.id, newRule.id, oldRule.lines, newRule.lines))
			}
		}
	}
	flushGap()

	return entries
}
