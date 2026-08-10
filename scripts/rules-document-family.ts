import type { CoreRulesDocument } from '@/lib/rules/core-rules-document'
import type { TournamentRulesDocument } from '@/lib/rules/tournament-rules-document'
import type {
	CoreRulesFamily,
	RegisteredCoreRulesVersion,
	RegisteredTournamentRulesVersion,
	TournamentRulesFamily,
} from './rules-manifest.ts'

export type ExtractedRulesDiagnostic = Readonly<{
	severity: 'warning'
	message: string
}>

export type ExtractedRulesVersion<RegisteredVersion, Document, Transcript extends string | null> = Readonly<{
	registeredVersion: RegisteredVersion
	lastUpdated: string
	document: Document
	transcript: Transcript
	diagnostics: readonly ExtractedRulesDiagnostic[]
}>

export type ExtractedRulesDocumentFamily<Version> = Readonly<{
	versions: readonly [Version, ...Version[]]
	currentVersion: Version
}>

export type RulesDocumentFamilyAdapter<Family, Result> = Readonly<{
	extract: (family: Family) => Promise<Result>
}>

export type ExtractedCoreRulesVersion = ExtractedRulesVersion<
	RegisteredCoreRulesVersion,
	CoreRulesDocument,
	string | null
>
export type ExtractedCoreRulesFamily = ExtractedRulesDocumentFamily<ExtractedCoreRulesVersion>

export type ExtractedTournamentRulesVersion = ExtractedRulesVersion<
	RegisteredTournamentRulesVersion,
	TournamentRulesDocument,
	string
>
export type ExtractedTournamentRulesFamily = ExtractedRulesDocumentFamily<ExtractedTournamentRulesVersion>

export type CoreRulesFamilyAdapter = RulesDocumentFamilyAdapter<CoreRulesFamily, ExtractedCoreRulesFamily>
export type TournamentRulesFamilyAdapter = RulesDocumentFamilyAdapter<
	TournamentRulesFamily,
	ExtractedTournamentRulesFamily
>

export { coreRulesFamilyAdapter } from './core-rules/extract.ts'
export { tournamentRulesFamilyAdapter } from './tournament-rules/extract.ts'
