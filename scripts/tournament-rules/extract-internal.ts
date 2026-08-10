import { join } from 'node:path'
import { tournamentRulesConventions } from '@/lib/rules/document-family-conventions'
import type { TournamentRulesDocument, TournamentRulesSection } from '@/lib/rules/tournament-rules-document'
import { normalizeRulesDate } from '../rules-date.ts'
import type {
	ExtractedRulesDiagnostic,
	ExtractedTournamentRulesVersion,
	TournamentRulesFamilyAdapter,
} from '../rules-document-family.ts'
import type { TournamentPdfReport, TournamentRow } from './inspect.ts'
import { structureTournamentRows, type TournamentStructureDiagnostic } from './structure.ts'
const TITLE = 'Riftbound Tournament Rules'

export type TournamentRulesExtractionDependencies = Readonly<{
	inspectSource: (path: string) => Promise<TournamentPdfReport>
	sourcesDirectory: string
	warn: (message: string) => void
}>

function completeRowText(row: TournamentRow): string {
	return `${row.rawLabel}${row.text ? ` ${row.text}` : ''}`.trim()
}

function validateReport(report: TournamentPdfReport, version: string): string {
	const lastUpdated = normalizeRulesDate(report.lastUpdated, `${report.file}: Last Updated`)
	if (report.version !== version)
		throw new Error(`${report.file}: filename does not identify version ${version}`)
	if (lastUpdated !== version) {
		throw new Error(
			`${report.file}: Last Updated ${report.lastUpdated || '(missing)'} does not match ${version}`,
		)
	}
	if (report.title !== TITLE) throw new Error(`${report.file}: unexpected document title ${report.title}`)
	if (report.rows.length === 0) throw new Error(`${report.file}: no table rows found`)
	if (report.rows.some(({ kind, id }) => kind !== 'rule' && !id)) {
		throw new Error(`${report.file}: heading without an ID`)
	}

	for (const row of report.rows.filter(({ active }) => !active)) {
		if (row.removedText !== completeRowText(row)) {
			throw new Error(`${report.file}: partial strikeout on page ${row.page} requires manual review`)
		}
	}
	return lastUpdated
}

function runtimeDocument(
	report: TournamentPdfReport,
	sections: TournamentRulesSection[],
): TournamentRulesDocument {
	return { schemaVersion: 1, version: report.version!, sections }
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

function serializeTranscript(report: TournamentPdfReport): string {
	const lines = [report.title, `Last Updated: ${report.lastUpdated}`]
	for (const row of report.rows.filter(({ active }) => active)) {
		lines.push(`${row.label ?? row.rawLabel}${row.text ? ` ${row.text}` : ''}`.trim())
	}
	return `${lines.join('\n')}\n`
}

export function createTournamentRulesFamilyAdapter({
	inspectSource,
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
				const report = await inspectSource(sourcePath)
				const lastUpdated = validateReport(report, registeredVersion.version)
				let structured: ReturnType<typeof structureTournamentRows>
				try {
					structured = structureTournamentRows(report.rows)
				} catch (cause) {
					throw new Error(`${report.file}: Tournament Rules structuring failed`, { cause })
				}
				const diagnostic = structureWarning(report.file, structured.diagnostics)
				if (diagnostic) warn(diagnostic.message)
				versions.push({
					registeredVersion,
					lastUpdated,
					document: runtimeDocument(report, structured.sections),
					transcript: serializeTranscript({ ...report, lastUpdated }),
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
