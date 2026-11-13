// PDF.js extraction pipeline shared by inspection and structured rules generation.

import { Data, Effect, Result } from 'effect'
import * as ByteSize from 'effect/ByteSize'
import * as FileSystem from 'effect/FileSystem'
import * as Path from 'effect/Path'
import type {
	CoreRulesDocument,
	CoreRulesSection,
	RuleNode,
	RulesHeading,
} from '@/lib/rules/core-rules-document'
import { coreRulesConventions } from '@/lib/rules/document-family-conventions'
import { normalizeRulesDate } from '../date'
import { reconstructPhysicalLines } from '../lines'
import type { RegisteredCoreRulesVersion } from '../manifest'
import { RulesPdf } from '../pdf'
import { assembleRuleBlocks, type RuleBlock } from './blocks'
import { structureRuleBlocks, type StructuredRuleNode } from './structure'

function compareRuleIds(left: string, right: string) {
	const leftParts = left.split('.')
	const rightParts = right.split('.')
	const length = Math.min(leftParts.length, rightParts.length)

	for (let index = 0; index < length; index++) {
		const leftPart = leftParts[index]
		const rightPart = rightParts[index]
		const leftNumber = /^\d+$/u.test(leftPart) ? Number(leftPart) : null
		const rightNumber = /^\d+$/u.test(rightPart) ? Number(rightPart) : null
		const comparison =
			leftNumber !== null && rightNumber !== null
				? leftNumber - rightNumber
				: leftPart.localeCompare(rightPart, 'en')

		if (comparison !== 0) return comparison
	}

	return leftParts.length - rightParts.length
}

function increment<Key>(map: Map<Key, number>, key: Key) {
	map.set(key, (map.get(key) ?? 0) + 1)
}

function countRuleNodes(nodes: readonly StructuredRuleNode[]): number {
	return nodes.reduce((total, node) => total + 1 + countRuleNodes(node.children), 0)
}

function groupOccurrences(records: readonly RuleBlock[]) {
	const occurrencesById = new Map<string, RuleBlock[]>()
	for (const record of records) {
		const occurrences = occurrencesById.get(record.id) ?? []
		occurrences.push(record)
		occurrencesById.set(record.id, occurrences)
	}
	return occurrencesById
}

function duplicateDetails(occurrencesById: ReadonlyMap<string, RuleBlock[]>) {
	return Object.fromEntries(
		[...occurrencesById].flatMap(([id, occurrences]) =>
			occurrences.length > 1
				? [
						[
							id,
							occurrences.map(({ sequence, label, page, x, y, bodyX, text }) => ({
								sequence,
								label,
								page,
								x,
								y,
								bodyX,
								text,
							})),
						] as const,
					]
				: [],
		),
	)
}

export const inspectCoreRulesPdf = Effect.fn('inspectCoreRulesPdf')(function* (path: string) {
	const fileSystem = yield* FileSystem.FileSystem
	const pathService = yield* Path.Path
	const pdf = yield* RulesPdf
	const absolutePath = pathService.resolve(path)
	const data = new Uint8Array(yield* fileSystem.readFile(absolutePath))
	const extracted = yield* pdf.withDocument({ path: absolutePath, data }, (document) =>
		Effect.gen(function* () {
			const pages: {
				page: number
				width: number
				lines: ReturnType<typeof reconstructPhysicalLines>
			}[] = []
			let physicalLineCount = 0
			let title = ''
			let lastUpdated = ''

			for (let pageNumber = 1; pageNumber <= document.pageCount; pageNumber++) {
				const page = yield* document.extractTextPage(pageNumber)
				const lines = reconstructPhysicalLines(page.items, pageNumber)
				physicalLineCount += lines.length
				pages.push({ page: pageNumber, width: page.width, lines })

				if (pageNumber === 1) {
					title = lines.find((line) => line.text.includes('Core Rules'))?.text ?? ''
					lastUpdated =
						lines
							.find((line) => line.text.includes('Last Updated:'))
							?.text.match(/Last Updated:\s*(.+)$/u)?.[1]
							?.trim() ?? ''
				}
			}

			return { pageCount: document.pageCount, pages, physicalLineCount, title, lastUpdated }
		}),
	)
	const fileStats = yield* fileSystem.stat(absolutePath)
	const { pageCount, pages, physicalLineCount, title, lastUpdated } = extracted
	const labelSizeCounts = new Map<number, number>()
	const headingCounts = new Map<NonNullable<RuleBlock['heading']>, number>()
	const headingSamples = new Map<NonNullable<RuleBlock['heading']>, string[]>()
	const { blocks, unassignedLines, ruleLikeTextOutsideLabelColumn } = assembleRuleBlocks(pages)
	for (const record of blocks) {
		increment(labelSizeCounts, record.fontSize)
		if (!record.heading) continue
		increment(headingCounts, record.heading)
		const samples = headingSamples.get(record.heading) ?? []
		if (samples.length < 12) samples.push(`${record.label} ${record.text}`.trim())
		headingSamples.set(record.heading, samples)
	}

	const occurrencesById = groupOccurrences(blocks)
	const backwardsIds: { previousId: string; id: string; pageNumber: number }[] = []
	for (let index = 1; index < blocks.length; index++) {
		const previousId = blocks[index - 1].id
		const id = blocks[index].id
		if (compareRuleIds(id, previousId) < 0) {
			backwardsIds.push({ previousId, id, pageNumber: blocks[index].page })
		}
	}

	const xCoordinates = blocks.map(({ x }) => x)
	const malformedLabels = blocks.filter(({ issues }) => issues.length > 0)
	const duplicateIds = duplicateDetails(occurrencesById)
	const structured = structureRuleBlocks(blocks)
	const structuredRuleCount = structured.sections.reduce(
		(total, section) =>
			total +
			countRuleNodes(section.preamble) +
			section.subsections.reduce((subtotal, subsection) => subtotal + countRuleNodes(subsection.rules), 0),
		0,
	)
	const structuredSubsectionCount = structured.sections.reduce(
		(total, section) => total + section.subsections.length,
		0,
	)
	const crossPageBlocks = blocks.filter(({ source }) => source.startPage !== source.endPage).length
	const assembledSourceLines = blocks.reduce((total, record) => total + record.sourceLines.length, 0)
	const assignedPhysicalLines = blocks.reduce((total, record) => total + record.physicalLineCount, 0)

	return {
		file: pathService.basename(absolutePath),
		bytes: ByteSize.toNumberUnsafe(fileStats.size),
		pages: pageCount,
		title,
		lastUpdated,
		ruleLabelOccurrences: blocks.length,
		distinctRuleIds: occurrencesById.size,
		duplicateIds,
		malformedLabels,
		backwardsIds,
		ruleLikeTextOutsideLabelColumn,
		physicalLineCount,
		assignedPhysicalLines,
		assembledSourceLines,
		crossPageBlocks,
		unassignedLines,
		labelXRange: xCoordinates.length > 0 ? [Math.min(...xCoordinates), Math.max(...xCoordinates)] : null,
		labelSizes: Object.fromEntries([...labelSizeCounts].toSorted(([left], [right]) => right - left)),
		headings: Object.fromEntries(headingCounts),
		headingSamples: Object.fromEntries(headingSamples),
		structured: {
			...structured,
			ruleCount: structuredRuleCount,
			subsectionCount: structuredSubsectionCount,
		},
		records: blocks,
	}
})

export type CoreRulesReport = Effect.Success<ReturnType<typeof inspectCoreRulesPdf>>

type CoreRulesSourceContext = Readonly<{
	family: 'core-rules'
	version: string
	path: string
}>

export type ExtractedCoreRulesVersion = Readonly<{
	registeredVersion: RegisteredCoreRulesVersion
	lastUpdated: string
	document: CoreRulesDocument
	transcript: string
	diagnostics: readonly Readonly<{ severity: 'warning'; message: string }>[]
}>

export type ExtractedCoreRulesFamily = Readonly<{
	versions: readonly [ExtractedCoreRulesVersion, ...ExtractedCoreRulesVersion[]]
	currentVersion: ExtractedCoreRulesVersion
}>

type CoreRulesExtractionReport = Readonly<
	Pick<
		CoreRulesReport,
		'file' | 'title' | 'lastUpdated' | 'physicalLineCount' | 'assignedPhysicalLines' | 'records'
	> & {
		unassignedLines: readonly Readonly<Pick<CoreRulesReport['unassignedLines'][number], 'text'>>[]
		structured: Readonly<Pick<CoreRulesReport['structured'], 'sections' | 'diagnostics'>>
	}
>

export type CoreRulesExtractionOperation = 'inspect-source' | 'validate-source'

export class CoreRulesExtractionError extends Data.TaggedError('CoreRulesExtractionError')<{
	readonly source: CoreRulesSourceContext
	readonly operation: CoreRulesExtractionOperation
	readonly message: string
	readonly cause: unknown
}> {}

function runtimeHeading(heading: { source: { sequence: number }; id: string; text: string }): RulesHeading {
	return { sequence: heading.source.sequence, id: heading.id, text: heading.text }
}

function runtimeRules(
	rules: CoreRulesExtractionReport['structured']['sections'][number]['preamble'],
): RuleNode[] {
	return rules.map((rule) => ({
		sequence: rule.source.sequence,
		id: rule.id,
		content: rule.content,
		children: runtimeRules(rule.children),
	}))
}

function runtimeSections(sections: CoreRulesExtractionReport['structured']['sections']): CoreRulesSection[] {
	return sections.map((section) => ({
		heading: runtimeHeading(section.heading),
		preamble: runtimeRules(section.preamble),
		subsections: section.subsections.map((subsection) => ({
			heading: runtimeHeading(subsection.heading),
			rules: runtimeRules(subsection.rules),
		})),
	}))
}

function validationError(
	source: CoreRulesSourceContext,
	message: string,
	cause?: unknown,
): CoreRulesExtractionError {
	return new CoreRulesExtractionError({
		source,
		operation: 'validate-source',
		message,
		cause,
	})
}

function validateReport(
	report: CoreRulesExtractionReport,
	source: CoreRulesSourceContext,
): Result.Result<string, CoreRulesExtractionError> {
	return Result.gen(function* () {
		if (!report.title) {
			return yield* Result.fail(validationError(source, `${report.file}: missing document title`))
		}
		const lastUpdated = yield* normalizeRulesDate(report.lastUpdated, `${report.file}: Last Updated`).pipe(
			Result.mapError((cause) => validationError(source, cause.message, cause)),
		)
		if (report.physicalLineCount !== report.assignedPhysicalLines + report.unassignedLines.length) {
			return yield* Result.fail(
				validationError(source, `${report.file}: physical line assignment is incomplete`),
			)
		}
		if (
			report.unassignedLines.length !== 2 ||
			report.unassignedLines[0]?.text !== report.title ||
			!report.unassignedLines[1]?.text.startsWith('Last Updated:')
		) {
			return yield* Result.fail(
				validationError(source, `${report.file}: unexpected content before the first rule block`),
			)
		}
		const structuralErrors = report.structured.diagnostics.filter(({ severity }) => severity === 'error')
		if (structuralErrors.length > 0) {
			return yield* Result.fail(
				validationError(
					source,
					`${report.file}: ${structuralErrors.length} structural errors`,
					structuralErrors,
				),
			)
		}
		return lastUpdated
	})
}

function serializeCoreRulesTranscript(report: CoreRulesExtractionReport): string {
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

export const extractCoreRulesVersion = Effect.fn('extractCoreRulesVersion')(function* (
	registeredVersion: RegisteredCoreRulesVersion,
	sourcesDirectory: string,
) {
	const pathService = yield* Path.Path
	const conventions = coreRulesConventions.version(registeredVersion.version)
	const source = {
		family: 'core-rules',
		version: registeredVersion.version,
		path: pathService.join(sourcesDirectory, conventions.source.pdfFilename),
	} as const
	const report = yield* inspectCoreRulesPdf(source.path).pipe(
		Effect.mapError((cause) => {
			const detail = cause instanceof Error ? `: ${cause.message}` : ''
			return new CoreRulesExtractionError({
				source,
				operation: 'inspect-source',
				message: `${source.path}: Core Rules inspection failed${detail}`,
				cause,
			})
		}),
	)
	const lastUpdated = yield* Effect.fromResult(validateReport(report, source))
	const document: CoreRulesDocument = {
		schemaVersion: 3,
		version: registeredVersion.version,
		sections: runtimeSections(report.structured.sections),
	}
	return {
		registeredVersion,
		lastUpdated,
		document,
		transcript: serializeCoreRulesTranscript({ ...report, lastUpdated }),
		diagnostics: report.structured.diagnostics
			.filter(({ severity }) => severity === 'warning')
			.map(({ message }) => ({ severity: 'warning', message: `${report.file}: ${message}` })),
	} satisfies ExtractedCoreRulesVersion
})
