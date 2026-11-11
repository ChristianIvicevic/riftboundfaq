import { Console, Effect } from 'effect'
import * as FileSystem from 'effect/FileSystem'
import * as Path from 'effect/Path'
import {
	coreRulesConventions,
	recognizeRulesSourceFilename,
	tournamentRulesConventions,
} from '@/lib/rules/document-family-conventions'
import {
	alreadyReportedRulesCliFailure,
	classifyRulesInspectionTarget,
	type RulesInspectionTarget,
} from './cli'
import { inspectCoreRulesPdf, type CoreRulesReport } from './core/extract'
import { inspectTournamentPdf, type TournamentPdfReport } from './tournament/extract'

type InspectionReport =
	| { type: 'core'; report: CoreRulesReport }
	| { type: 'tournament'; report: TournamentPdfReport }

export const defaultCoreRulesPdfPaths = Effect.fnUntraced(function* () {
	const fileSystem = yield* FileSystem.FileSystem
	const pathService = yield* Path.Path
	const sourcesDirectory = pathService.resolve(import.meta.dirname, '..', '..', 'sources')
	const entries = yield* fileSystem.readDirectory(sourcesDirectory)
	return entries
		.flatMap((filename) => {
			const source = recognizeRulesSourceFilename(filename)
			return source?.kind === 'pdf' && source.family === 'core-rules'
				? [{ filename, version: source.version }]
				: []
		})
		.toSorted((left, right) => coreRulesConventions.compareVersions(left.version, right.version))
		.map(({ filename }) => pathService.join(sourcesDirectory, filename))
})

export const defaultTournamentRulesPdfPaths = Effect.fnUntraced(function* () {
	const fileSystem = yield* FileSystem.FileSystem
	const pathService = yield* Path.Path
	const sourcesDirectory = pathService.resolve(import.meta.dirname, '..', '..', 'sources')
	const entries = yield* fileSystem.readDirectory(sourcesDirectory)
	return entries
		.flatMap((filename) => {
			const source = recognizeRulesSourceFilename(filename)
			return source?.kind === 'pdf' && source.family === 'tournament-rules'
				? [{ filename, version: source.version }]
				: []
		})
		.toSorted((left, right) => tournamentRulesConventions.compareVersions(left.version, right.version))
		.map(({ filename }) => pathService.join(sourcesDirectory, filename))
})

function printCoreRulesReport(report: CoreRulesReport, log: (...args: ReadonlyArray<unknown>) => void): void {
	log(`\n${report.file}`)
	log(`  ${report.title || 'Unknown title'} | Last Updated: ${report.lastUpdated || 'unknown'}`)
	log(`  ${(report.bytes / 1024 / 1024).toFixed(1)} MiB | ${report.pages} pages`)
	log(`  Rule label occurrences: ${report.ruleLabelOccurrences} (${report.distinctRuleIds} distinct IDs)`)
	log(`  Label x-range: ${report.labelXRange?.join('-') ?? 'none'}`)
	log(`  Label font sizes: ${JSON.stringify(report.labelSizes)}`)
	log(`  Physical lines: ${report.physicalLineCount}`)
	log(`  Assigned physical lines: ${report.assignedPhysicalLines}`)
	log(`  Block content lines: ${report.assembledSourceLines} (${report.crossPageBlocks} cross-page blocks)`)
	log(`  Unassigned lines before first block: ${report.unassignedLines.length}`)
	log(`  Heading candidates: ${JSON.stringify(report.headings)}`)
	log(
		`  Structured document: ${report.structured.sections.length} sections, ${report.structured.subsectionCount} subsections, ${report.structured.ruleCount} rules`,
	)
	log(`  Structure diagnostics: ${report.structured.diagnostics.length}`)

	for (const [kind, samples] of Object.entries(report.headingSamples)) {
		log(`  ${kind}: ${samples.join(' | ')}`)
	}

	const duplicateEntries = Object.entries(report.duplicateIds)
	if (duplicateEntries.length > 0) {
		log(
			`  Duplicate IDs preserved: ${duplicateEntries.map(([id, occurrences]) => `${id} (${occurrences.length})`).join(', ')}`,
		)
	}
	if (report.malformedLabels.length > 0) {
		const samples = report.malformedLabels
			.slice(0, 12)
			.map(({ label, page, issues }) => `${label} [page ${page}: ${issues.join(', ')}]`)
		log(`  Numbering issues: ${report.malformedLabels.length} (${samples.join(' | ')})`)
	}
	if (report.backwardsIds.length > 0) log(`  Backwards IDs: ${JSON.stringify(report.backwardsIds)}`)
	log(`  Rule-like text outside label column: ${report.ruleLikeTextOutsideLabelColumn}`)
}

function printTournamentRulesReport(
	report: TournamentPdfReport,
	log: (...args: ReadonlyArray<unknown>) => void,
): void {
	log(`\n${report.file}`)
	log(`  ${report.title || 'Unknown title'} | Last Updated: ${report.lastUpdated || 'unknown'}`)
	log(`  ${(report.bytes / 1024 / 1024).toFixed(1)} MiB | ${report.pages} pages`)
	log(
		`  Rows: ${report.rowCount} (${report.numberedRowCount} numbered, ${report.unnumberedRowCount} unnumbered)`,
	)
	log(`  Active/deleted: ${report.activeRowCount}/${report.deletedRowCount}`)
	log(`  Headings: ${report.headingCounts.primary} primary, ${report.headingCounts.secondary} secondary`)
	log(`  Cross-page joins: ${report.crossPageJoins}`)
	log(
		`  Missing label periods: ${report.diagnostics.filter(({ code }) => code === 'missing-label-period').length}`,
	)
	log(`  Malformed/missing labels: ${report.malformedLabels.length}/${report.missingIds.length}`)
	log(`  Duplicate IDs: ${Object.keys(report.duplicateIds).length}`)
	log(`  Backwards IDs: ${report.backwardsIds.length}`)
	log(`  Strikeout removals: ${report.strikeoutRemovals.length}`)
	for (const removal of report.strikeoutRemovals) {
		log(`    p${removal.page} ${removal.rawLabel || '(unnumbered)'} ${removal.removedText}`)
	}
	log(`  Highlighted active rows: ${report.highlightedActiveRows.length}`)
}

export const inspectRules = Effect.fn('inspectRules')(function* (cliArguments: readonly string[]) {
	const pathService = yield* Path.Path
	const json = cliArguments.includes('--json')
	const requestedPaths = cliArguments.filter((argument) => argument !== '--' && argument !== '--json')
	const targets: RulesInspectionTarget[] = []

	if (requestedPaths.length > 0) {
		for (const path of requestedPaths) {
			targets.push(
				yield* Effect.fromResult(
					classifyRulesInspectionTarget({ filename: pathService.basename(path), path }),
				),
			)
		}
	} else {
		const corePaths = yield* defaultCoreRulesPdfPaths()
		const tournamentPaths = yield* defaultTournamentRulesPdfPaths()
		targets.push(
			...corePaths.map((path): RulesInspectionTarget => ({ type: 'core', path })),
			...tournamentPaths.map((path): RulesInspectionTarget => ({ type: 'tournament', path })),
		)
	}

	if (targets.length === 0) {
		yield* Console.error('No rules PDFs found. Pass one or more Core or Tournament Rules PDF paths.')
		return yield* Effect.fail(alreadyReportedRulesCliFailure)
	}

	const reports: InspectionReport[] = []
	for (const target of targets) {
		// Documents stay sequential so PDF.js workers, fonts, and operator caches do not accumulate.
		const inspected: InspectionReport =
			target.type === 'core'
				? { type: target.type, report: yield* inspectCoreRulesPdf(target.path) }
				: { type: target.type, report: yield* inspectTournamentPdf(target.path) }
		reports.push(inspected)
	}

	if (json) yield* Console.log(JSON.stringify(reports, null, 2))
	else {
		yield* Console.consoleWith((console) =>
			Effect.sync(() => {
				const log = console.log.bind(console)
				for (const { type, report } of reports) {
					if (type === 'core') printCoreRulesReport(report, log)
					else printTournamentRulesReport(report, log)
				}
			}),
		)
	}
})
