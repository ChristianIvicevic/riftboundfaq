import { describe, expect, test, vi } from 'vitest'
import { assembleRuleBlocks, type RulePage } from './core-rules/blocks.ts'
import { createCoreRulesFamilyAdapter } from './core-rules/extract-internal.ts'
import type { CoreRulesReport } from './core-rules/inspect.ts'
import type { PdfTextItem } from './core-rules/lines.ts'
import { structureRuleBlocks } from './core-rules/structure.ts'
import { parseRulesManifest } from './rules-manifest.ts'
import { createTournamentRulesFamilyAdapter } from './tournament-rules/extract-internal.ts'
import type { TournamentRulesSource } from './tournament-rules/inspect.ts'
import type { TournamentRulesSourceRow } from './tournament-rules/source-rows.ts'

function textItem(str: string, x: number, y: number, size = 8, width = str.length * 4): PdfTextItem {
	return { str, transform: [size, 0, 0, size, x, y], width, height: size }
}

function rulePage(rows: PdfTextItem[][]): RulePage {
	return {
		page: 1,
		width: 600,
		lines: rows.map((items, index) => ({
			page: 1,
			line: index + 1,
			x: Math.min(...items.map(({ transform }) => transform[4])),
			y: items[0].transform[5],
			width: 100,
			text: items
				.map(({ str }) => str.trim())
				.filter(Boolean)
				.join(' '),
			items,
		})),
	}
}

function coreRulesReport(): CoreRulesReport {
	const { blocks } = assembleRuleBlocks([
		rulePage([
			[textItem('100.', 20, 700, 20, 35), textItem('Game Concepts', 80, 700, 20, 130)],
			[textItem('100.1.', 20, 660, 8, 35), textItem('Preamble.', 80, 660, 8, 50)],
			[textItem('100.2.', 20, 620, 12, 35), textItem('Actions', 80, 620, 12, 45)],
			[textItem('100.2.1.', 20, 580, 8, 45), textItem('Example: Do this.', 80, 580, 8, 90)],
		]),
	])
	const structured = structureRuleBlocks(blocks)
	structured.diagnostics.push({
		severity: 'warning',
		code: 'heading-style-mismatch',
		message: 'Preserved unusual heading style.',
		ruleId: '100',
		source: structured.sections[0].heading.source,
	})
	return {
		file: 'CR-v1.0.pdf',
		title: 'Riftbound Core Rules',
		lastUpdated: '2026-01-01',
		physicalLineCount: 6,
		assignedPhysicalLines: 4,
		unassignedLines: [{ text: 'Riftbound Core Rules' }, { text: 'Last Updated: 2026-01-01' }],
		structured,
		records: blocks,
	} as unknown as CoreRulesReport
}

function tournamentRow(
	input: Partial<TournamentRulesSourceRow> &
		Pick<TournamentRulesSourceRow, 'sequence' | 'kind' | 'text'> & { id?: string | null },
): TournamentRulesSourceRow {
	const { id = null, ...row } = input
	return {
		label: id ? { sourceText: `${id}.`, id, text: `${id}.`, normalization: 'unchanged' } : null,
		activity: { status: 'active', removalEvidence: null },
		sourcePages: { start: 1, end: 1 },
		...row,
	}
}

function tournamentRulesSource(): TournamentRulesSource {
	return {
		file: 'Tournament-Rules-2026-01-01.pdf',
		version: '2026-01-01',
		title: 'Riftbound Tournament Rules',
		lastUpdated: '2026-01-01',
		rows: [
			tournamentRow({
				sequence: 0,
				kind: 'primary-heading',
				id: '100',
				text: 'Tournament Operations',
			}),
			tournamentRow({ sequence: 1, kind: 'rule', text: 'A preserved unnumbered rule.' }),
		],
	}
}

describe('Rules document family extraction', () => {
	test('extracts a validated Core Rules family through one interface', async () => {
		const manifest = parseRulesManifest({
			coreRules: { current: '1.0', versions: { '1.0': { name: 'Launch' } } },
			tournamentRules: { current: '2026-01-01', versions: { '2026-01-01': {} } },
		})
		const inspectSource = vi.fn(async () => coreRulesReport())
		const adapter = createCoreRulesFamilyAdapter({ inspectSource, sourcesDirectory: '/rules' })

		const extracted = await adapter.extract(manifest.coreRules)

		expect(inspectSource).toHaveBeenCalledWith('/rules/CR-v1.0.pdf')
		expect(extracted.currentVersion).toBe(extracted.versions[0])
		expect(extracted).toStrictEqual({
			versions: [
				{
					registeredVersion: manifest.coreRules.registeredVersions[0],
					lastUpdated: '2026-01-01',
					document: {
						schemaVersion: 3,
						version: '1.0',
						sections: [
							{
								heading: { sequence: 1, id: '100', text: 'Game Concepts' },
								preamble: [
									{
										sequence: 2,
										id: '100.1',
										content: [{ kind: 'paragraph', text: 'Preamble.' }],
										children: [],
									},
								],
								subsections: [
									{
										heading: { sequence: 3, id: '100.2', text: 'Actions' },
										rules: [
											{
												sequence: 4,
												id: '100.2.1',
												content: [{ kind: 'example', text: 'Example: Do this.' }],
												children: [],
											},
										],
									},
								],
							},
						],
					},
					transcript:
						'Riftbound Core Rules\nLast Updated: 2026-01-01\n100. Game Concepts\n100.1. Preamble.\n100.2. Actions\n100.2.1. Example: Do this.\n',
					diagnostics: [{ severity: 'warning', message: 'Preserved unusual heading style.' }],
				},
			],
			currentVersion: extracted.versions[0],
		})
	})

	test('extracts Tournament Rules while preserving reportable anomalies', async () => {
		const manifest = parseRulesManifest({
			coreRules: { current: '1.0', versions: { '1.0': {} } },
			tournamentRules: { current: '2026-01-01', versions: { '2026-01-01': {} } },
		})
		const readSource = vi.fn(async () => tournamentRulesSource())
		const warn = vi.fn()
		const adapter = createTournamentRulesFamilyAdapter({
			readSource,
			sourcesDirectory: '/rules',
			warn,
		})

		const extracted = await adapter.extract(manifest.tournamentRules)

		expect(readSource).toHaveBeenCalledWith('/rules/Tournament-Rules-2026-01-01.pdf')
		expect(warn).toHaveBeenCalledWith(
			'Tournament-Rules-2026-01-01.pdf: preserved structural anomalies (unnumbered-rule: 1)',
		)
		expect(extracted.currentVersion).toBe(extracted.versions[0])
		expect(extracted.versions[0]).toStrictEqual({
			registeredVersion: manifest.tournamentRules.registeredVersions[0],
			lastUpdated: '2026-01-01',
			document: {
				schemaVersion: 1,
				version: '2026-01-01',
				sections: [
					{
						heading: { sequence: 0, id: '100', text: 'Tournament Operations' },
						blocks: [
							{
								kind: 'rules',
								rules: [
									{
										sequence: 1,
										id: null,
										label: null,
										content: [{ kind: 'paragraph', text: 'A preserved unnumbered rule.' }],
										children: [],
									},
								],
							},
						],
					},
				],
			},
			transcript:
				'Riftbound Tournament Rules\nLast Updated: 2026-01-01\n100. Tournament Operations\nA preserved unnumbered rule.\n',
			diagnostics: [
				{
					severity: 'warning',
					message: 'Tournament-Rules-2026-01-01.pdf: preserved structural anomalies (unnumbered-rule: 1)',
				},
			],
		})
	})

	test('processes Registered rules versions sequentially and returns no partial family', async () => {
		const manifest = parseRulesManifest({
			coreRules: { current: '1.2', versions: { '1.0': {}, 1.1: {}, 1.2: {} } },
			tournamentRules: { current: '2026-01-01', versions: { '2026-01-01': {} } },
		})
		const inspectedPaths: string[] = []
		const adapter = createCoreRulesFamilyAdapter({
			sourcesDirectory: '/rules',
			async inspectSource(path) {
				inspectedPaths.push(path)
				if (path.endsWith('CR-v1.1.pdf')) throw new Error('invalid Core Rules')
				return coreRulesReport()
			},
		})

		await expect(adapter.extract(manifest.coreRules)).rejects.toThrow(/invalid Core Rules/u)
		expect(inspectedPaths).toStrictEqual(['/rules/CR-v1.0.pdf', '/rules/CR-v1.1.pdf'])
	})

	test('preserves Core Rules order and transcript eligibility across a family', async () => {
		const manifest = parseRulesManifest({
			coreRules: { current: '1.1', versions: { '1.0': {}, 1.1: { name: 'Origins' } } },
			tournamentRules: { current: '2026-01-01', versions: { '2026-01-01': {} } },
		})
		const inspectedPaths: string[] = []
		const adapter = createCoreRulesFamilyAdapter({
			sourcesDirectory: '/rules',
			async inspectSource(path) {
				inspectedPaths.push(path)
				return coreRulesReport()
			},
		})

		const extracted = await adapter.extract(manifest.coreRules)

		expect(inspectedPaths).toStrictEqual(['/rules/CR-v1.0.pdf', '/rules/CR-v1.1.pdf'])
		expect(extracted.versions.map(({ registeredVersion }) => registeredVersion.version)).toStrictEqual([
			'1.0',
			'1.1',
		])
		expect(extracted.versions[0].transcript).toBeNull()
		expect(extracted.versions[1].transcript).toMatch(/^Riftbound Core Rules/u)
		expect(extracted.currentVersion).toBe(extracted.versions[1])
	})

	test('rejects a Core Rules report that loses physical lines', async () => {
		const manifest = parseRulesManifest({
			coreRules: { current: '1.0', versions: { '1.0': {} } },
			tournamentRules: { current: '2026-01-01', versions: { '2026-01-01': {} } },
		})
		const adapter = createCoreRulesFamilyAdapter({
			sourcesDirectory: '/rules',
			async inspectSource() {
				return { ...coreRulesReport(), physicalLineCount: 7 }
			},
		})

		await expect(adapter.extract(manifest.coreRules)).rejects.toThrow(
			/physical line assignment is incomplete/u,
		)
	})

	test('preserves Tournament Rules order across a successfully extracted family', async () => {
		const manifest = parseRulesManifest({
			coreRules: { current: '1.0', versions: { '1.0': {} } },
			tournamentRules: {
				current: '2026-02-01',
				versions: { '2026-01-01': {}, '2026-02-01': {} },
			},
		})
		const adapter = createTournamentRulesFamilyAdapter({
			sourcesDirectory: '/rules',
			warn: vi.fn(),
			async readSource(path) {
				const version = path.match(/(\d{4}-\d{2}-\d{2})\.pdf$/u)![1]
				return {
					...tournamentRulesSource(),
					file: `Tournament-Rules-${version}.pdf`,
					version,
					lastUpdated: version,
				}
			},
		})

		const extracted = await adapter.extract(manifest.tournamentRules)

		expect(extracted.versions.map(({ registeredVersion }) => registeredVersion.version)).toStrictEqual([
			'2026-01-01',
			'2026-02-01',
		])
		expect(extracted.currentVersion).toBe(extracted.versions[1])
	})

	test('stops Tournament Rules extraction at the first failed Registered rules version', async () => {
		const manifest = parseRulesManifest({
			coreRules: { current: '1.0', versions: { '1.0': {} } },
			tournamentRules: {
				current: '2026-03-01',
				versions: { '2026-01-01': {}, '2026-02-01': {}, '2026-03-01': {} },
			},
		})
		const inspectedPaths: string[] = []
		const adapter = createTournamentRulesFamilyAdapter({
			sourcesDirectory: '/rules',
			warn: vi.fn(),
			async readSource(path) {
				inspectedPaths.push(path)
				if (path.endsWith('2026-02-01.pdf')) throw new Error('invalid Tournament Rules')
				const version = path.match(/(\d{4}-\d{2}-\d{2})\.pdf$/u)![1]
				return {
					...tournamentRulesSource(),
					file: `Tournament-Rules-${version}.pdf`,
					version,
					lastUpdated: version,
				}
			},
		})

		await expect(adapter.extract(manifest.tournamentRules)).rejects.toThrow(/invalid Tournament Rules/u)
		expect(inspectedPaths).toStrictEqual([
			'/rules/Tournament-Rules-2026-01-01.pdf',
			'/rules/Tournament-Rules-2026-02-01.pdf',
		])
	})

	test('rejects partial Tournament Rules strikeouts before projection', async () => {
		const manifest = parseRulesManifest({
			coreRules: { current: '1.0', versions: { '1.0': {} } },
			tournamentRules: { current: '2026-01-01', versions: { '2026-01-01': {} } },
		})
		const warn = vi.fn()
		const adapter = createTournamentRulesFamilyAdapter({
			sourcesDirectory: '/rules',
			warn,
			async readSource() {
				const source = tournamentRulesSource()
				return {
					...source,
					rows: [
						...source.rows,
						tournamentRow({
							sequence: 2,
							kind: 'rule',
							id: '100.1',
							text: 'Removed policy.',
							activity: {
								status: 'removed',
								removalEvidence: { text: 'Removed', coverage: 'partial' },
							},
						}),
					],
				}
			},
		})

		await expect(adapter.extract(manifest.tournamentRules)).rejects.toThrow(
			/partial strikeout on page 1 requires manual review/u,
		)
		expect(warn).not.toHaveBeenCalled()
	})
})
