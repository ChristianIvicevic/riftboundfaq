// PDF.js extraction pipeline shared by inspection and structured rules generation.

import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { coreRulesConventions, recognizeRulesSourceFilename } from '@/lib/rules/document-family-conventions'
import { assembleRuleBlocks, type RuleBlock } from './blocks.ts'
import { reconstructPhysicalLines } from './lines.ts'
import { structureRuleBlocks, type StructuredRuleNode } from './structure.ts'

const SOURCES_DIRECTORY = resolve(import.meta.dirname, '..', '..', 'sources')

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
		[...occurrencesById]
			.filter(([, occurrences]) => occurrences.length > 1)
			.map(([id, occurrences]) => [
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
			]),
	)
}

export async function defaultPdfPaths() {
	const entries = await readdir(SOURCES_DIRECTORY)
	return entries
		.flatMap((filename) => {
			const source = recognizeRulesSourceFilename(filename)
			return source?.kind === 'pdf' && source.family === 'core-rules'
				? [{ filename, version: source.version }]
				: []
		})
		.toSorted((left, right) => coreRulesConventions.compareVersions(left.version, right.version))
		.map(({ filename }) => join(SOURCES_DIRECTORY, filename))
}

export async function inspectPdf(path: string) {
	const absolutePath = resolve(path)
	const data = new Uint8Array(await readFile(absolutePath))
	const documentParameters = { data, disableWorker: true }
	const loadingTask = getDocument(documentParameters)
	const document = await loadingTask.promise
	const pageCount = document.numPages
	const pages: { page: number; width: number; lines: ReturnType<typeof reconstructPhysicalLines> }[] = []
	const labelSizeCounts = new Map<number, number>()
	const headingCounts = new Map<NonNullable<RuleBlock['heading']>, number>()
	const headingSamples = new Map<NonNullable<RuleBlock['heading']>, string[]>()
	let physicalLineCount = 0
	let title = ''
	let lastUpdated = ''

	for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
		// Pages are intentionally processed sequentially to cap memory use for large PDFs.
		// oxlint-disable-next-line no-await-in-loop
		const page = await document.getPage(pageNumber)
		// oxlint-disable-next-line no-await-in-loop
		const textContent = await page.getTextContent()

		const lines = reconstructPhysicalLines(textContent.items, pageNumber)
		physicalLineCount += lines.length
		pages.push({ page: pageNumber, width: page.view[2], lines })

		if (pageNumber === 1) {
			title = lines.find((line) => line.text.includes('Core Rules'))?.text ?? ''
			lastUpdated =
				lines
					.find((line) => line.text.includes('Last Updated:'))
					?.text.match(/Last Updated:\s*(.+)$/u)?.[1]
					?.trim() ?? ''
		}

		page.cleanup()
	}

	await loadingTask.destroy()
	const fileStats = await stat(absolutePath)
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
		file: basename(absolutePath),
		bytes: fileStats.size,
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
}

export type CoreRulesReport = Awaited<ReturnType<typeof inspectPdf>>

export function printReport(report: CoreRulesReport) {
	console.log(`\n${report.file}`)
	console.log(`  ${report.title || 'Unknown title'} | Last Updated: ${report.lastUpdated || 'unknown'}`)
	console.log(`  ${(report.bytes / 1024 / 1024).toFixed(1)} MiB | ${report.pages} pages`)
	console.log(
		`  Rule label occurrences: ${report.ruleLabelOccurrences} (${report.distinctRuleIds} distinct IDs)`,
	)
	console.log(`  Label x-range: ${report.labelXRange?.join('-') ?? 'none'}`)
	console.log(`  Label font sizes: ${JSON.stringify(report.labelSizes)}`)
	console.log(`  Physical lines: ${report.physicalLineCount}`)
	console.log(`  Assigned physical lines: ${report.assignedPhysicalLines}`)
	console.log(
		`  Block content lines: ${report.assembledSourceLines} (${report.crossPageBlocks} cross-page blocks)`,
	)
	console.log(`  Unassigned lines before first block: ${report.unassignedLines.length}`)
	console.log(`  Heading candidates: ${JSON.stringify(report.headings)}`)
	console.log(
		`  Structured document: ${report.structured.sections.length} sections, ${report.structured.subsectionCount} subsections, ${report.structured.ruleCount} rules`,
	)
	console.log(`  Structure diagnostics: ${report.structured.diagnostics.length}`)

	for (const [kind, samples] of Object.entries(report.headingSamples)) {
		console.log(`  ${kind}: ${samples.join(' | ')}`)
	}

	const duplicateEntries = Object.entries(report.duplicateIds)
	if (duplicateEntries.length > 0) {
		console.log(
			`  Duplicate IDs preserved: ${duplicateEntries.map(([id, occurrences]) => `${id} (${occurrences.length})`).join(', ')}`,
		)
	}
	if (report.malformedLabels.length > 0) {
		const samples = report.malformedLabels
			.slice(0, 12)
			.map(({ label, page, issues }) => `${label} [page ${page}: ${issues.join(', ')}]`)
		console.log(`  Numbering issues: ${report.malformedLabels.length} (${samples.join(' | ')})`)
	}
	if (report.backwardsIds.length > 0) console.log(`  Backwards IDs: ${JSON.stringify(report.backwardsIds)}`)
	console.log(`  Rule-like text outside label column: ${report.ruleLikeTextOutsideLabelColumn}`)
}
