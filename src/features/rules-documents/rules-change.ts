import type {
	RulesDiffRecord,
	RulesDocumentFamily,
	RulesDocumentFamilyCatalog,
} from '@/features/rules-documents/family-catalog'
import { diffRuleSets, type DiffEntry } from '@/lib/rules/diff'
import { coreRulesLinks, tournamentRulesLinks } from '@/lib/rules/links'

type PreparedRulesChangeVersion = Readonly<{
	version: string
	label: string
}>

export type PreparedRulesChangeRule = Readonly<{
	id: string
	label: string
	href: string
	lines: readonly string[]
}>

export type PreparedRulesChangeText = Readonly<{
	type: 'same' | 'add' | 'remove'
	text: string
}>

export type PreparedRulesChangeEntry =
	| Readonly<{ kind: 'added'; rule: PreparedRulesChangeRule }>
	| Readonly<{ kind: 'removed'; rule: PreparedRulesChangeRule }>
	| Readonly<{
			kind: 'modified'
			oldRule: PreparedRulesChangeRule
			newRule: PreparedRulesChangeRule
			oldText: readonly PreparedRulesChangeText[]
			newText: readonly PreparedRulesChangeText[]
	  }>

export type PreparedRulesChange = Readonly<{
	from: PreparedRulesChangeVersion
	to: PreparedRulesChangeVersion
	entries: readonly PreparedRulesChangeEntry[]
}>

export type RulesChangeErrorReason = 'unknown-version' | 'non-adjacent' | 'reversed' | 'same-version'

export class RulesChangeError extends Error {
	constructor(
		readonly reason: RulesChangeErrorReason,
		readonly family: RulesDocumentFamily,
		readonly from: string,
		readonly to: string,
	) {
		super(
			`Invalid ${family === 'core-rules' ? 'Core Rules' : 'Tournament Rules'} Change page from ${JSON.stringify(from)} to ${JSON.stringify(to)}: ${reason}`,
		)
	}
}

function formatTournamentRulesVersion(version: string) {
	return new Intl.DateTimeFormat('en-US', {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC',
	}).format(new Date(`${version}T00:00:00Z`))
}

function prepareText(tokens: readonly PreparedRulesChangeText[]) {
	return Object.freeze(tokens.map((token) => Object.freeze({ ...token })))
}

export function prepareRulesChange(
	catalog: RulesDocumentFamilyCatalog,
	{ from, to }: Readonly<{ from: string; to: string }>,
): PreparedRulesChange {
	const family = catalog.currentVersion.type
	const fromIndex = catalog.registeredVersions.findIndex(({ version }) => version === from)
	const toIndex = catalog.registeredVersions.findIndex(({ version }) => version === to)
	if (fromIndex === -1 || toIndex === -1) throw new RulesChangeError('unknown-version', family, from, to)
	if (fromIndex === toIndex) throw new RulesChangeError('same-version', family, from, to)
	if (fromIndex > toIndex) throw new RulesChangeError('reversed', family, from, to)
	if (toIndex !== fromIndex + 1) throw new RulesChangeError('non-adjacent', family, from, to)

	const oldDocument = catalog.get(from)
	const newDocument = catalog.get(to)
	const prepareRule = (record: RulesDiffRecord, version: string): PreparedRulesChangeRule => {
		const href =
			family === 'core-rules'
				? coreRulesLinks.rule({ number: record.id, version })
				: tournamentRulesLinks.rule({ anchor: record.anchor, version })
		return Object.freeze({
			id: record.id,
			label: family === 'core-rules' ? `${record.id}.` : record.label,
			href,
			lines: Object.freeze([...record.lines]),
		})
	}
	const options =
		family === 'tournament-rules'
			? {
					hideRenumbering: true,
					hideReferenceOnlyChanges: true,
					prioritizeTextSimilarity: true,
					referenceSyntax: 'tournament' as const,
				}
			: undefined
	const entries = diffRuleSets(oldDocument.diffRecords, newDocument.diffRecords, options).map(
		(entry): PreparedRulesChangeEntry => prepareEntry(entry, from, to, prepareRule),
	)
	const label = (version: string, name: string | null) =>
		family === 'core-rules' ? (name ?? `Core Rules ${version}`) : formatTournamentRulesVersion(version)

	return Object.freeze({
		from: Object.freeze({ version: from, label: label(from, oldDocument.identity.name) }),
		to: Object.freeze({ version: to, label: label(to, newDocument.identity.name) }),
		entries: Object.freeze(entries),
	})
}

function prepareEntry(
	entry: DiffEntry<RulesDiffRecord>,
	from: string,
	to: string,
	prepareRule: (record: RulesDiffRecord, version: string) => PreparedRulesChangeRule,
): PreparedRulesChangeEntry {
	if (entry.kind === 'added') {
		return Object.freeze({ kind: entry.kind, rule: prepareRule(entry.rule, to) })
	}
	if (entry.kind === 'removed') {
		return Object.freeze({ kind: entry.kind, rule: prepareRule(entry.rule, from) })
	}
	return Object.freeze({
		kind: entry.kind,
		oldRule: prepareRule(entry.oldRule, from),
		newRule: prepareRule(entry.newRule, to),
		oldText: prepareText(entry.oldText),
		newText: prepareText(entry.newText),
	})
}
