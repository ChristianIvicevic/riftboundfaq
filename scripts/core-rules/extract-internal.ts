import { join } from 'node:path'
import type {
	CoreRulesDocument,
	CoreRulesSection,
	RuleNode,
	RulesHeading,
} from '@/lib/rules/core-rules-document'
import { coreRulesConventions } from '@/lib/rules/document-family-conventions'
import { normalizeRulesDate } from '../rules-date.ts'
import type { CoreRulesFamilyAdapter, ExtractedCoreRulesVersion } from '../rules-document-family.ts'
import type { CoreRulesReport } from './inspect.ts'

export type CoreRulesExtractionDependencies = Readonly<{
	inspectSource: (path: string) => Promise<CoreRulesReport>
	sourcesDirectory: string
}>

function runtimeHeading(heading: { source: { sequence: number }; id: string; text: string }): RulesHeading {
	return { sequence: heading.source.sequence, id: heading.id, text: heading.text }
}

function runtimeRules(rules: CoreRulesReport['structured']['sections'][number]['preamble']): RuleNode[] {
	return rules.map((rule) => ({
		sequence: rule.source.sequence,
		id: rule.id,
		content: rule.content,
		children: runtimeRules(rule.children),
	}))
}

function runtimeSections(sections: CoreRulesReport['structured']['sections']): CoreRulesSection[] {
	return sections.map((section) => ({
		heading: runtimeHeading(section.heading),
		preamble: runtimeRules(section.preamble),
		subsections: section.subsections.map((subsection) => ({
			heading: runtimeHeading(subsection.heading),
			rules: runtimeRules(subsection.rules),
		})),
	}))
}

function validateReport(report: CoreRulesReport): string {
	if (!report.title) throw new Error(`${report.file}: missing document title`)
	const lastUpdated = normalizeRulesDate(report.lastUpdated, `${report.file}: Last Updated`)
	if (report.physicalLineCount !== report.assignedPhysicalLines + report.unassignedLines.length) {
		throw new Error(`${report.file}: physical line assignment is incomplete`)
	}
	if (
		report.unassignedLines.length !== 2 ||
		report.unassignedLines[0]?.text !== report.title ||
		!report.unassignedLines[1]?.text.startsWith('Last Updated:')
	) {
		throw new Error(`${report.file}: unexpected content before the first rule block`)
	}
	const structuralErrors = report.structured.diagnostics.filter(({ severity }) => severity === 'error')
	if (structuralErrors.length > 0) {
		throw new Error(`${report.file}: ${structuralErrors.length} structural errors`)
	}
	return lastUpdated
}

function serializeCoreRulesTranscript(report: CoreRulesReport): string {
	const lines = [report.title, `Last Updated: ${report.lastUpdated}`]
	for (const record of report.records) {
		const [firstLine, ...continuationLines] = record.sourceLines
		lines.push(
			`${record.label}${firstLine?.text ? ` ${firstLine.text}` : ''}`,
			...continuationLines.map(({ text }) => text),
		)
	}
	return `${lines.join('\n')}\n`
}

export function createCoreRulesFamilyAdapter({
	inspectSource,
	sourcesDirectory,
}: CoreRulesExtractionDependencies): CoreRulesFamilyAdapter {
	return {
		async extract(family) {
			const versions: ExtractedCoreRulesVersion[] = []
			for (const registeredVersion of family.registeredVersions) {
				const conventions = coreRulesConventions.version(registeredVersion.version)
				const sourcePath = join(sourcesDirectory, conventions.source.pdfFilename)
				// Large PDFs are intentionally processed sequentially to cap memory usage.
				// oxlint-disable-next-line no-await-in-loop
				const report = await inspectSource(sourcePath)
				const lastUpdated = validateReport(report)
				const document: CoreRulesDocument = {
					schemaVersion: 3,
					version: registeredVersion.version,
					sections: runtimeSections(report.structured.sections),
				}
				versions.push({
					registeredVersion,
					lastUpdated,
					document,
					transcript: registeredVersion.name
						? serializeCoreRulesTranscript({ ...report, lastUpdated })
						: null,
					diagnostics: report.structured.diagnostics
						.filter(({ severity }) => severity === 'warning')
						.map(({ message }) => ({ severity: 'warning', message })),
				})
			}

			const extractedVersions = versions as [ExtractedCoreRulesVersion, ...ExtractedCoreRulesVersion[]]
			const currentVersion = extractedVersions.find(
				({ registeredVersion }) => registeredVersion === family.currentVersion,
			)!
			return { versions: extractedVersions, currentVersion }
		},
	}
}
