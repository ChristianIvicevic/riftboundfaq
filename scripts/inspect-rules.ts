import { basename } from 'node:path'
import { defaultPdfPaths, inspectPdf, printReport } from './core-rules/inspect.ts'
import {
	defaultTournamentPdfPaths,
	inspectTournamentPdf,
	printTournamentReport,
} from './tournament-rules/inspect.ts'

const cliArguments = process.argv.slice(2)
const json = cliArguments.includes('--json')
const requestedPaths = cliArguments.filter((argument) => argument !== '--' && argument !== '--json')
type Target = { type: 'core' | 'tournament'; path: string }
type InspectionReport =
	| { type: 'core'; report: Awaited<ReturnType<typeof inspectPdf>> }
	| { type: 'tournament'; report: Awaited<ReturnType<typeof inspectTournamentPdf>> }

const targets: Target[] = []

if (requestedPaths.length > 0) {
	for (const path of requestedPaths) {
		const filename = basename(path)
		if (/^CR-v.+\.pdf$/u.test(filename)) targets.push({ type: 'core', path })
		else if (/^Tournament-Rules-.+\.pdf$/u.test(filename)) targets.push({ type: 'tournament', path })
		else throw new Error(`Unsupported rules PDF filename: ${filename}`)
	}
} else {
	targets.push(
		...(await defaultPdfPaths()).map((path): Target => ({ type: 'core', path })),
		...(await defaultTournamentPdfPaths()).map((path): Target => ({ type: 'tournament', path })),
	)
}

if (targets.length === 0) {
	console.error('No rules PDFs found. Pass one or more Core or Tournament Rules PDF paths.')
	process.exit(1)
}

const reports: InspectionReport[] = []
for (const target of targets) {
	// Documents stay sequential so PDF.js workers, fonts, and operator caches do not accumulate.
	// oxlint-disable no-await-in-loop
	const inspected: InspectionReport =
		target.type === 'core'
			? { type: target.type, report: await inspectPdf(target.path) }
			: { type: target.type, report: await inspectTournamentPdf(target.path) }
	// oxlint-enable no-await-in-loop
	reports.push(inspected)
}

if (json) console.log(JSON.stringify(reports, null, 2))
else {
	for (const { type, report } of reports) {
		if (type === 'core') printReport(report)
		else printTournamentReport(report)
	}
}
