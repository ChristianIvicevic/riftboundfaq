import { tokenizeRulesText } from '@/lib/rules/text-tokens'
import type { RuleRecord } from '@/lib/rules/types'
import { alignIndicesByScore } from '@/lib/sequence-alignment'

type TokenType = 'same' | 'add' | 'remove'
type Token = { type: TokenType; text: string }

/**
 * A single row in a rendered diff between two rule sets.
 * - `added`   — rule exists only in the new version.
 * - `removed` — rule exists only in the old version.
 * - `modified` — rule exists in both but its text changed; `oldText`/`newText` hold the inline
 *   token diff for the left (old) and right (new) columns; their IDs differ when the rule was
 *   renumbered. Each rule is diffed as one continuous line, so source line breaks
 *   (e.g. an example moved onto its own line) are not treated as edits.
 */
export type DiffEntry<Rule extends RuleRecord = RuleRecord> =
	| { kind: 'added'; rule: Rule }
	| { kind: 'removed'; rule: Rule }
	| { kind: 'modified'; oldRule: Rule; newRule: Rule; oldText: Token[]; newText: Token[] }

export type RuleMatch<Rule extends RuleRecord = RuleRecord> = {
	oldRule: Rule
	newRule: Rule
}

export type RuleSetComparison<Rule extends RuleRecord = RuleRecord> = {
	entries: DiffEntry<Rule>[]
	matches: RuleMatch<Rule>[]
}

export type DiffOptions<Rule extends RuleRecord = RuleRecord> = {
	canMatch?: (oldRule: Rule, newRule: Rule) => boolean
	hideRenumbering?: boolean
	hideReferenceOnlyChanges?: boolean
	referenceSyntax?: 'generic' | 'tournament'
}

type Op<T> = { type: TokenType; value: T }

/** Longest-common-subsequence diff of two sequences, returned as an ordered op list. */
function diffSequence<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean): Op<T>[] {
	return alignIndicesByScore(a.length, b.length, (leftIndex, rightIndex) =>
		eq(a[leftIndex], b[rightIndex]) ? 1 : 0,
	).map((alignment): Op<T> => {
		if (alignment.type === 'left') return { type: 'remove', value: a[alignment.leftIndex] }
		if (alignment.type === 'right') return { type: 'add', value: b[alignment.rightIndex] }
		return { type: 'same', value: a[alignment.leftIndex] }
	})
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
	const tokens: Token[] = ops.flatMap((op) =>
		op.type === 'same' || op.type === change ? [{ type: op.type, text: op.value }] : [],
	)
	for (let i = 1; i < tokens.length - 1; i++) {
		const token = tokens[i]
		const bridges = tokens[i - 1].type === change && tokens[i + 1].type === change
		if (token.type === 'same' && bridges && /^\s+$/u.test(token.text)) token.type = change
	}
	return trimHighlightEdges(mergeTokens(tokens))
}

/** Build a modified entry: word-level diff of the two rules' joined text. */
function buildModified<Rule extends RuleRecord>(oldRule: Rule, newRule: Rule): DiffEntry<Rule> {
	const ops = diffSequence(
		tokenizeRulesText(oldRule.lines.join(' ')),
		tokenizeRulesText(newRule.lines.join(' ')),
		(x, y) => x === y,
	)
	return {
		kind: 'modified',
		oldRule,
		newRule,
		oldText: sideTokens(ops, 'remove'),
		newText: sideTokens(ops, 'add'),
	}
}

/**
 * Two non-identical rules are treated as the same rule (a modification) when either measure over
 * their word-level LCS clears its threshold; otherwise they are reported as an independent removal
 * + addition. `SIMILARITY` (Dice) handles balanced edits; `CONTAINMENT` (LCS over the shorter rule)
 * handles asymmetric ones, e.g. a short rule that gained a long example. Tunable; callers can
 * constrain eligible pairs further with `canMatch`.
 */
const SIMILARITY_THRESHOLD = 0.5
const CONTAINMENT_THRESHOLD = 0.8

/** A rule's text as a single normalized string, used for content matching. */
function normalizedText(rule: RuleRecord): string {
	return rule.lines.join(' ').replaceAll(/\s+/gu, ' ').trim()
}

const RULE_ID = /\d{3}(?:\.[0-9a-z]+)*/giu
const GENERIC_RULE_REFERENCE = /\brules?\s+\d{3}(?:\.[0-9a-z]+)*/giu
const TOURNAMENT_CR_REFERENCE = /\bCR\s+\d{3}(?:\.[0-9a-z]+)*/giu
const TOURNAMENT_CUED_REFERENCE =
	/\b(?:see(?:\s+rule)?|section|steps?|proceed to|process of|described in|except for|perform|listed (?:under|in)|qualifies for|meets?)\s+\d{3}(?:\.[0-9a-z]+)*(?:\.?\s*(?:-|–|—|and|or)\s*\d{3}(?:\.[0-9a-z]+)*)*/giu

const maskIds = (reference: string) => reference.replaceAll(RULE_ID, 'rule#')

/**
 * Replace IDs in recognizable rule-reference expressions with a placeholder. A rule whose only
 * change is such a reference then compares equal, without treating unrelated numbers as references.
 */
function maskRuleReferences(text: string, syntax: 'generic' | 'tournament'): string {
	const masked = text.replaceAll(GENERIC_RULE_REFERENCE, maskIds)
	if (syntax === 'generic') return masked
	return masked.replaceAll(TOURNAMENT_CR_REFERENCE, maskIds).replaceAll(TOURNAMENT_CUED_REFERENCE, maskIds)
}

function splitWords(text: string): string[] {
	return text.split(/\s+/u).filter(Boolean)
}

function textWithoutLeadingOrdinal(text: string): string | null {
	return text.match(/^\d+\.\s+(.+)$/u)?.[1] ?? null
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

/**
 * Diff two ordered rule sets by **content**. By default, rules that were only renumbered and rules
 * changed only by a `rule N` reference are omitted. Callers can retain either category. Remaining
 * gaps are re-aligned by similarity (and, with the default behavior, matching IDs): matched rules
 * become modifications, while the rest are genuine additions/removals. Document order is preserved.
 */
export function compareRuleSets<Rule extends RuleRecord>(
	oldRules: readonly Rule[],
	newRules: readonly Rule[],
	{
		canMatch = () => true,
		hideRenumbering = true,
		hideReferenceOnlyChanges = true,
		referenceSyntax = 'generic',
	}: DiffOptions<Rule> = {},
): RuleSetComparison<Rule> {
	const oldText = oldRules.map((rule) => normalizedText(rule))
	const newText = newRules.map((rule) => normalizedText(rule))

	const entries: DiffEntry<Rule>[] = []
	const matches: RuleMatch<Rule>[] = []
	let gapOld: number[] = []
	let gapNew: number[] = []

	const flushGap = () => {
		if (gapOld.length === 0 && gapNew.length === 0) return
		const ordinalMatchScore = 2 * Math.min(gapOld.length, gapNew.length) + 1
		const matchScore = (i: number, j: number) => {
			const oldRule = oldRules[gapOld[i]]
			const newRule = newRules[gapNew[j]]
			if (!canMatch(oldRule, newRule)) return 0
			const oldNorm = oldText[gapOld[i]]
			const newNorm = newText[gapNew[j]]
			const oldWithoutOrdinal = textWithoutLeadingOrdinal(oldNorm)
			const newWithoutOrdinal = textWithoutLeadingOrdinal(newNorm)
			// An ordinal-only title change is stronger than every possible combination of partial matches
			// in this gap, so an inserted numbered title cannot steal its counterpart.
			if (oldWithoutOrdinal !== null && oldWithoutOrdinal === newWithoutOrdinal) return ordinalMatchScore
			if (textsMatch(oldNorm, newNorm)) return 2
			return oldRule.id === newRule.id ? 1 : 0
		}
		const gapOps = alignIndicesByScore(gapOld.length, gapNew.length, matchScore)
		for (const op of gapOps) {
			if (op.type === 'left') {
				entries.push({ kind: 'removed', rule: oldRules[gapOld[op.leftIndex]] })
			} else if (op.type === 'right') {
				entries.push({ kind: 'added', rule: newRules[gapNew[op.rightIndex]] })
			} else {
				const oldRule = oldRules[gapOld[op.leftIndex]]
				const newRule = newRules[gapNew[op.rightIndex]]
				matches.push({ oldRule, newRule })
				const oldNorm = oldText[gapOld[op.leftIndex]]
				const newNorm = newText[gapNew[op.rightIndex]]
				// Identical text is just a renumber. A change limited to referenced rule numbers is
				// likewise noise (the referenced rule moved, not this one's meaning) by default.
				if (oldNorm === newNorm && (oldRule.id === newRule.id || hideRenumbering)) continue
				if (
					oldNorm !== newNorm &&
					hideReferenceOnlyChanges &&
					(oldRule.id === newRule.id || hideRenumbering) &&
					maskRuleReferences(oldNorm, referenceSyntax) === maskRuleReferences(newNorm, referenceSyntax)
				) {
					continue
				}
				entries.push(buildModified(oldRule, newRule))
			}
		}
		gapOld = []
		gapNew = []
	}

	// Exact text remains the stable alignment anchor even when a renumbering should be displayed.
	const anchorOps = alignIndicesByScore(oldRules.length, newRules.length, (oldIndex, newIndex) => {
		if (!canMatch(oldRules[oldIndex], newRules[newIndex])) return 0
		return oldText[oldIndex] === newText[newIndex] ? 1 : 0
	})
	for (const op of anchorOps) {
		if (op.type === 'left') {
			gapOld.push(op.leftIndex)
		} else if (op.type === 'right') {
			gapNew.push(op.rightIndex)
		} else {
			flushGap()
			const oldRule = oldRules[op.leftIndex]
			const newRule = newRules[op.rightIndex]
			matches.push({ oldRule, newRule })
			if (!hideRenumbering && oldRule.id !== newRule.id) {
				entries.push(buildModified(oldRule, newRule))
			}
		}
	}
	flushGap()

	return { entries, matches }
}

export function diffRuleSets<Rule extends RuleRecord>(
	oldRules: readonly Rule[],
	newRules: readonly Rule[],
	options: DiffOptions<Rule> = {},
): DiffEntry<Rule>[] {
	return compareRuleSets(oldRules, newRules, options).entries
}
