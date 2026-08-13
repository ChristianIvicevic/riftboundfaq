import { join } from 'node:path'
import { tournamentRulesConventions } from '@/lib/rules/document-family-conventions'
import type { TournamentRulesDocument, TournamentRulesSection } from '@/lib/rules/tournament-rules-document'
import { normalizeRulesDate } from '../rules-date'
import type {
	ExtractedRulesDiagnostic,
	ExtractedTournamentRulesVersion,
	TournamentRulesFamilyAdapter,
} from '../rules-document-family'
import type { TournamentRulesSource } from './inspect'
import { structureTournamentRows, type TournamentStructureDiagnostic } from './structure'
const TITLE = 'Riftbound Tournament Rules'

export type TournamentRulesExtractionDependencies = Readonly<{
	readSource: (path: string) => Promise<TournamentRulesSource>
	sourcesDirectory: string
	warn: (message: string) => void
}>

function validateSource(source: TournamentRulesSource, version: string): string {
	const lastUpdated = normalizeRulesDate(source.lastUpdated, `${source.file}: Last Updated`)
	if (source.version !== version)
		throw new Error(`${source.file}: filename does not identify version ${version}`)
	if (lastUpdated !== version) {
		throw new Error(
			`${source.file}: Last Updated ${source.lastUpdated || '(missing)'} does not match ${version}`,
		)
	}
	if (source.title !== TITLE) throw new Error(`${source.file}: unexpected document title ${source.title}`)
	if (source.rows.length === 0) throw new Error(`${source.file}: no table rows found`)
	if (source.rows.some(({ kind, label }) => kind !== 'rule' && !label?.id)) {
		throw new Error(`${source.file}: heading without an ID`)
	}

	for (const row of source.rows) {
		if (row.activity.status === 'removed' && row.activity.removalEvidence.coverage === 'partial') {
			throw new Error(
				`${source.file}: partial strikeout on page ${row.sourcePages.start} requires manual review`,
			)
		}
	}
	return lastUpdated
}

function runtimeDocument(
	source: TournamentRulesSource,
	sections: TournamentRulesSection[],
): TournamentRulesDocument {
	return { schemaVersion: 1, version: source.version!, sections }
}

function structureWarning(
	file: string,
	diagnostics: TournamentStructureDiagnostic[],
): ExtractedRulesDiagnostic | null {
	if (diagnostics.length === 0) return null
	const counts = new Map<TournamentStructureDiagnostic['code'], number>()
	for (const { code } of diagnostics) counts.set(code, (counts.get(code) ?? 0) + 1)
	const summary = [...counts]
		.toSorted(([left], [right]) => left.localeCompare(right))
		.map(([code, count]) => `${code}: ${count}`)
		.join(', ')
	return { severity: 'warning', message: `${file}: preserved structural anomalies (${summary})` }
}

function serializeTranscript(source: TournamentRulesSource): string {
	const lines = [source.title, `Last Updated: ${source.lastUpdated}`]
	for (const row of source.rows.filter(({ activity }) => activity.status === 'active')) {
		lines.push(`${row.label?.text ?? ''}${row.text ? ` ${row.text}` : ''}`.trim())
	}
	return `${lines.join('\n')}\n`
}

export function createTournamentRulesFamilyAdapter({
	readSource,
	sourcesDirectory,
	warn,
}: TournamentRulesExtractionDependencies): TournamentRulesFamilyAdapter {
	return {
		async extract(family) {
			const versions: ExtractedTournamentRulesVersion[] = []
			for (const registeredVersion of family.registeredVersions) {
				const conventions = tournamentRulesConventions.version(registeredVersion.version)
				const sourcePath = join(sourcesDirectory, conventions.source.pdfFilename)
				// Large PDFs are intentionally processed sequentially to cap memory usage.
				// oxlint-disable-next-line no-await-in-loop
				const source = await readSource(sourcePath)
				const lastUpdated = validateSource(source, registeredVersion.version)
				let structured: ReturnType<typeof structureTournamentRows>
				try {
					structured = structureTournamentRows(source.rows)
				} catch (cause) {
					throw new Error(`${source.file}: Tournament Rules structuring failed`, { cause })
				}
				const diagnostic = structureWarning(source.file, structured.diagnostics)
				if (diagnostic) warn(diagnostic.message)
				versions.push({
					registeredVersion,
					lastUpdated,
					document: runtimeDocument(source, structured.sections),
					transcript: serializeTranscript({ ...source, lastUpdated }),
					diagnostics: diagnostic ? [diagnostic] : [],
				})
			}

			const extractedVersions = versions as [
				ExtractedTournamentRulesVersion,
				...ExtractedTournamentRulesVersion[],
			]
			const currentVersion = extractedVersions.find(
				({ registeredVersion }) => registeredVersion === family.currentVersion,
			)!
			return { versions: extractedVersions, currentVersion }
		},
	}
}
