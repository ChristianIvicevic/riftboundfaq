import * as NodeServices from '@effect/platform-node/NodeServices'
import { expect, expectTypeOf, layer } from '@effect/vitest'
import { Cause, Console, Effect, Exit, Option } from 'effect'
import * as FileSystem from 'effect/FileSystem'
import * as Path from 'effect/Path'
import { OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { generateRules, RulesGenerationError } from './generate'
import { testLayer as rulesPdfTestLayer, type PdfJsDocument, type PdfJsPage } from './pdf'

const SCRIPTS_DIRECTORY = import.meta.dirname
const CORE_RULES_PDF_MARKER = 1
const TOURNAMENT_RULES_PDF_MARKER = 2

function textItem(str: string, x: number, y: number, size = 8, width = str.length * 4) {
	return { str, transform: [size, 0, 0, size, x, y], width, height: size }
}

function coreRulesPage(
	title = 'Riftbound Core Rules',
	headingBodySize = 20,
	lastUpdated = '2026-01-01',
): PdfJsPage {
	return {
		view: [0, 0, 600, 800],
		getTextContent: () =>
			Promise.resolve({
				items: [
					textItem(title, 80, 760, 16),
					textItem(`Last Updated: ${lastUpdated}`, 80, 740),
					textItem('100.', 20, 700, 20, 35),
					textItem('Game Concepts', 80, 700, headingBodySize, 130),
					textItem('100.1.', 20, 660, 8, 35),
					textItem('A generated rule.', 80, 660, 8, 68),
				],
			}),
		getOperatorList: () => Promise.resolve({ fnArray: [], argsArray: [] }),
		cleanup: () => false,
	}
}

function tournamentRulesPage(lastUpdated = '1/1/2026'): PdfJsPage {
	return {
		view: [0, 0, 600, 800],
		getTextContent: () =>
			Promise.resolve({
				items: [
					textItem('Riftbound Tournament Rules', 80, 760, 16),
					textItem(`Last Updated: ${lastUpdated}`, 80, 740),
					textItem('100.', 40, 170, 20),
					textItem('Tournament Operations', 130, 170, 20),
					textItem('100.1.', 40, 130),
					textItem('A tournament rule.', 130, 130),
				],
			}),
		getOperatorList: () =>
			Promise.resolve({
				fnArray: [OPS.setFillRGBColor, OPS.constructPath, OPS.constructPath],
				argsArray: [
					[0.8, 0.8, 0.8],
					[OPS.fill, null, [36, 200, 575, 201]],
					[OPS.fill, null, [36, 100, 575, 101]],
				],
			}),
		cleanup: () => false,
	}
}

function anomalousTournamentRulesPage(version: string): PdfJsPage {
	return {
		view: [0, 0, 600, 800],
		getTextContent: () =>
			Promise.resolve({
				items: [
					textItem('Riftbound Tournament Rules', 80, 760, 16),
					textItem(`Last Updated: ${version}`, 80, 740),
					textItem('100.', 40, 170, 20),
					textItem('Tournament Operations', 130, 170, 20),
					textItem('A preserved unnumbered rule.', 130, 110),
				],
			}),
		getOperatorList: () =>
			Promise.resolve({
				fnArray: [OPS.setFillRGBColor, OPS.constructPath, OPS.constructPath, OPS.constructPath],
				argsArray: [
					[0.8, 0.8, 0.8],
					[OPS.fill, null, [36, 200, 575, 201]],
					[OPS.fill, null, [36, 140, 575, 141]],
					[OPS.fill, null, [36, 80, 575, 81]],
				],
			}),
		cleanup: () => false,
	}
}

function partiallyStruckTournamentRulesPage(): PdfJsPage {
	return {
		view: [0, 0, 600, 800],
		getTextContent: () =>
			Promise.resolve({
				items: [
					textItem('Riftbound Tournament Rules', 80, 760, 16),
					textItem('Last Updated: 2026-01-01', 80, 740),
					textItem('100.', 40, 170, 20),
					textItem('Tournament Operations', 130, 170, 20),
					textItem('100.1.', 40, 110),
					textItem('Partially removed policy.', 130, 110),
				],
			}),
		getOperatorList: () =>
			Promise.resolve({
				fnArray: [
					OPS.setFillRGBColor,
					OPS.constructPath,
					OPS.constructPath,
					OPS.constructPath,
					OPS.constructPath,
				],
				argsArray: [
					[0.8, 0.8, 0.8],
					[OPS.fill, null, [36, 200, 575, 201]],
					[OPS.fill, null, [36, 140, 575, 141]],
					[OPS.fill, null, [36, 80, 575, 81]],
					[OPS.stroke, null, [130, 114, 170, 114.5]],
				],
			}),
		cleanup: () => false,
	}
}

function rulesPdfLayer(pages: Readonly<{ core?: PdfJsPage; tournament?: PdfJsPage }> = {}) {
	return rulesPdfTestLayer((data) => {
		const page =
			data[0] === CORE_RULES_PDF_MARKER
				? (pages.core ?? coreRulesPage())
				: (pages.tournament ?? tournamentRulesPage())
		const document: PdfJsDocument = { numPages: 1, getPage: () => Promise.resolve(page) }
		return { promise: Promise.resolve(document), destroy: () => Promise.resolve() }
	})
}

function historyRulesPdfLayer() {
	const pages = new Map<number, PdfJsPage>([
		[1, coreRulesPage('Riftbound Core Rules', 20, '2025-06-02')],
		[2, tournamentRulesPage('7/21/2025')],
		[3, coreRulesPage('Riftbound Core Rules', 20, '2025-10-01')],
		[4, tournamentRulesPage('3/30/2026')],
		[5, coreRulesPage('Riftbound Core Rules', 20, '2025-12-01')],
		[6, tournamentRulesPage('4/29/2026')],
	])
	return rulesPdfTestLayer((data) => {
		const page = pages.get(data[0])
		if (!page) throw new Error(`Unexpected history PDF marker ${data[0]}`)
		const document: PdfJsDocument = { numPages: 1, getPage: () => Promise.resolve(page) }
		return { promise: Promise.resolve(document), destroy: () => Promise.resolve() }
	})
}

const writeProjectFile = Effect.fnUntraced(function* (
	projectDirectory: string,
	path: string,
	contents: string,
) {
	const fileSystem = yield* FileSystem.FileSystem
	const pathService = yield* Path.Path
	const destination = pathService.join(projectDirectory, path)
	yield* fileSystem.makeDirectory(pathService.dirname(destination), { recursive: true })
	yield* fileSystem.writeFileString(destination, contents)
})

const writeProjectBytes = Effect.fnUntraced(function* (
	projectDirectory: string,
	path: string,
	contents: Uint8Array,
) {
	const fileSystem = yield* FileSystem.FileSystem
	const pathService = yield* Path.Path
	const destination = pathService.join(projectDirectory, path)
	yield* fileSystem.makeDirectory(pathService.dirname(destination), { recursive: true })
	yield* fileSystem.writeFile(destination, contents)
})

const readProjectFile = Effect.fnUntraced(function* (projectDirectory: string, path: string) {
	const fileSystem = yield* FileSystem.FileSystem
	const pathService = yield* Path.Path
	return yield* fileSystem.readFileString(pathService.join(projectDirectory, path))
})

const temporaryProject = Effect.fnUntraced(function* () {
	const fileSystem = yield* FileSystem.FileSystem
	const pathService = yield* Path.Path
	const projectDirectory = yield* fileSystem.makeTempDirectoryScoped({ prefix: 'riftbound-generation-' })
	yield* writeProjectFile(
		projectDirectory,
		'sources/rules-manifest.json',
		JSON.stringify({
			coreRules: { current: '1.0', versions: { '1.0': { name: 'Launch' } } },
			tournamentRules: { current: '2026-01-01', versions: { '2026-01-01': {} } },
		}),
	)
	yield* writeProjectBytes(projectDirectory, 'sources/CR-v1.0.pdf', new Uint8Array([CORE_RULES_PDF_MARKER]))
	yield* writeProjectBytes(
		projectDirectory,
		'sources/Tournament-Rules-2026-01-01.pdf',
		new Uint8Array([TOURNAMENT_RULES_PDF_MARKER]),
	)
	yield* fileSystem.copy(
		pathService.join(SCRIPTS_DIRECTORY, 'templates'),
		pathService.join(projectDirectory, 'scripts', 'rules', 'templates'),
	)
	return projectDirectory
})

const historyProject = Effect.fnUntraced(function* () {
	const projectDirectory = yield* temporaryProject()
	yield* writeProjectFile(
		projectDirectory,
		'sources/rules-manifest.json',
		JSON.stringify({
			coreRules: {
				current: '1.2',
				versions: {
					'1.2': { name: 'Spiritforged' },
					'1.1': { name: 'Origins' },
					'1.0': {},
				},
			},
			tournamentRules: {
				current: '2026-04-29',
				versions: { '2026-04-29': {}, '2026-03-30': {}, '2025-07-21': {} },
			},
		}),
	)
	yield* writeProjectBytes(projectDirectory, 'sources/CR-v1.1.pdf', new Uint8Array([3]))
	yield* writeProjectBytes(projectDirectory, 'sources/CR-v1.2.pdf', new Uint8Array([5]))
	yield* writeProjectBytes(projectDirectory, 'sources/Tournament-Rules-2025-07-21.pdf', new Uint8Array([2]))
	yield* writeProjectBytes(projectDirectory, 'sources/Tournament-Rules-2026-03-30.pdf', new Uint8Array([4]))
	yield* writeProjectBytes(projectDirectory, 'sources/Tournament-Rules-2026-04-29.pdf', new Uint8Array([6]))
	return projectDirectory
})

const filesUnder = Effect.fnUntraced(function* (projectDirectory: string, relativeDirectory: string) {
	const fileSystem = yield* FileSystem.FileSystem
	const pathService = yield* Path.Path
	const directory = pathService.join(projectDirectory, relativeDirectory)
	const entries = yield* fileSystem
		.readDirectory(directory, { recursive: true })
		.pipe(Effect.catchReason('PlatformError', 'NotFound', () => Effect.succeed<string[]>([])))
	const files = yield* Effect.forEach(entries, (entry) =>
		Effect.gen(function* () {
			const info = yield* fileSystem.stat(pathService.join(directory, entry))
			return info.type === 'File' ? `${relativeDirectory}/${entry}` : null
		}),
	)
	return files.flatMap((path) => (path === null ? [] : [path])).toSorted()
})

const expectCompleteGeneratedOutput = Effect.fnUntraced(function* (projectDirectory: string) {
	expect(yield* filesUnder(projectDirectory, 'artifacts/rules/transcripts')).toStrictEqual([
		'artifacts/rules/transcripts/CR-v1.0.txt',
		'artifacts/rules/transcripts/Tournament-Rules-2026-01-01.txt',
	])
	expect(yield* filesUnder(projectDirectory, 'src/generated/core-rules')).toStrictEqual([
		'src/generated/core-rules/index.ts',
		'src/generated/core-rules/v1-0.ts',
	])
	expect(yield* filesUnder(projectDirectory, 'src/generated/tournament-rules')).toStrictEqual([
		'src/generated/tournament-rules/index.ts',
		'src/generated/tournament-rules/v2026-01-01.ts',
	])
	expect(yield* filesUnder(projectDirectory, 'content/rules-documents')).toHaveLength(8)
})

layer(NodeServices.layer)('generateRules', (it) => {
	it('exposes one compact typed failure', () => {
		expectTypeOf<Effect.Error<ReturnType<typeof generateRules>>>().toEqualTypeOf<RulesGenerationError>()
	})

	it.effect('generates complete owned output from a clean output tree', () =>
		Effect.gen(function* () {
			const fileSystem = yield* FileSystem.FileSystem
			const pathService = yield* Path.Path
			const projectDirectory = yield* temporaryProject()
			expect(yield* fileSystem.exists(pathService.join(projectDirectory, 'artifacts'))).toBe(false)
			expect(yield* fileSystem.exists(pathService.join(projectDirectory, 'src/generated'))).toBe(false)
			expect(yield* fileSystem.exists(pathService.join(projectDirectory, 'content'))).toBe(false)

			const summary = yield* generateRules({ projectDirectory }).pipe(Effect.provide(rulesPdfLayer()))

			expect(summary).toStrictEqual({
				coreRules: { current: '1.0', versions: 1, transcripts: 1 },
				tournamentRules: { current: '2026-01-01', versions: 1, transcripts: 1 },
				reference: { pages: 3 },
			})
			yield* expectCompleteGeneratedOutput(projectDirectory)
		}),
	)

	it.effect('generates exact modules and rules-document history from complete families', () =>
		Effect.gen(function* () {
			const projectDirectory = yield* historyProject()

			const summary = yield* generateRules({ projectDirectory }).pipe(Effect.provide(historyRulesPdfLayer()))

			expect(summary).toStrictEqual({
				coreRules: { current: '1.2', versions: 3, transcripts: 3 },
				tournamentRules: { current: '2026-04-29', versions: 3, transcripts: 3 },
				reference: { pages: 11 },
			})
			expect(yield* filesUnder(projectDirectory, 'artifacts/rules/transcripts')).toStrictEqual([
				'artifacts/rules/transcripts/CR-v1.0.txt',
				'artifacts/rules/transcripts/CR-v1.1.txt',
				'artifacts/rules/transcripts/CR-v1.2.txt',
				'artifacts/rules/transcripts/Tournament-Rules-2025-07-21.txt',
				'artifacts/rules/transcripts/Tournament-Rules-2026-03-30.txt',
				'artifacts/rules/transcripts/Tournament-Rules-2026-04-29.txt',
			])
			expect(yield* filesUnder(projectDirectory, 'content/rules-documents')).toStrictEqual(
				[
					'content/rules-documents/index.mdx',
					'content/rules-documents/meta.json',
					'content/rules-documents/core-rules/1.2.mdx',
					'content/rules-documents/core-rules/(archive)/1.0.mdx',
					'content/rules-documents/core-rules/(archive)/1.1.mdx',
					'content/rules-documents/core-rules/(archive)/meta.json',
					'content/rules-documents/core-rules/changes/1.1.mdx',
					'content/rules-documents/core-rules/changes/1.2.mdx',
					'content/rules-documents/core-rules/changes/meta.json',
					'content/rules-documents/tournament-rules/2026-04-29.mdx',
					'content/rules-documents/tournament-rules/(archive)/2025-07-21.mdx',
					'content/rules-documents/tournament-rules/(archive)/2026-03-30.mdx',
					'content/rules-documents/tournament-rules/(archive)/meta.json',
					'content/rules-documents/tournament-rules/changes/2026-03-30.mdx',
					'content/rules-documents/tournament-rules/changes/2026-04-29.mdx',
					'content/rules-documents/tournament-rules/changes/meta.json',
				].toSorted(),
			)
			expect(yield* readProjectFile(projectDirectory, 'src/generated/core-rules/index.ts')).toBe(
				`// Generated by pnpm rules:generate. Do not edit.

import { PDF_CORE_RULES_1_0 } from '@/generated/core-rules/v1-0'
import { PDF_CORE_RULES_1_1 } from '@/generated/core-rules/v1-1'
import { PDF_CORE_RULES_1_2 } from '@/generated/core-rules/v1-2'
import type { CoreRulesDocument } from '@/lib/rules/core-rules-document'

export const CURRENT_PDF_CORE_RULES_VERSION = "1.2"

export const PDF_CORE_RULES_VERSIONS: Record<string, CoreRulesDocument> = {
	"1.0": PDF_CORE_RULES_1_0,
	"1.1": PDF_CORE_RULES_1_1,
	"1.2": PDF_CORE_RULES_1_2,
}

export const PDF_CORE_RULES_VERSION_NAMES: Record<string, string> = {
	"1.1": "Origins",
	"1.2": "Spiritforged",
}
`,
			)
			expect(yield* readProjectFile(projectDirectory, 'src/generated/tournament-rules/index.ts')).toBe(
				`// Generated by pnpm rules:generate. Do not edit.

import { PDF_TOURNAMENT_RULES_2025_07_21 } from '@/generated/tournament-rules/v2025-07-21'
import { PDF_TOURNAMENT_RULES_2026_03_30 } from '@/generated/tournament-rules/v2026-03-30'
import { PDF_TOURNAMENT_RULES_2026_04_29 } from '@/generated/tournament-rules/v2026-04-29'
import type { TournamentRulesDocument } from '@/lib/rules/tournament-rules-document'

export const CURRENT_PDF_TOURNAMENT_RULES_VERSION = "2026-04-29"

export const PDF_TOURNAMENT_RULES_DOCUMENTS: Record<string, TournamentRulesDocument> = {
	"2025-07-21": PDF_TOURNAMENT_RULES_2025_07_21,
	"2026-03-30": PDF_TOURNAMENT_RULES_2026_03_30,
	"2026-04-29": PDF_TOURNAMENT_RULES_2026_04_29,
}
`,
			)
			expect(yield* readProjectFile(projectDirectory, 'src/generated/core-rules/v1-0.ts'))
				.toMatchInlineSnapshot(`
				"// Generated by pnpm rules:generate. Do not edit.

				import type { CoreRulesDocument } from '@/lib/rules/core-rules-document'

				// oxfmt-ignore
				export const PDF_CORE_RULES_1_0: CoreRulesDocument = {
				  "schemaVersion": 3,
				  "version": "1.0",
				  "sections": [
				    {
				      "heading": {
				        "sequence": 1,
				        "id": "100",
				        "text": "Game Concepts"
				      },
				      "preamble": [
				        {
				          "sequence": 2,
				          "id": "100.1",
				          "content": [
				            {
				              "kind": "paragraph",
				              "text": "A generated rule."
				            }
				          ],
				          "children": []
				        }
				      ],
				      "subsections": []
				    }
				  ]
				}
				"
			`)
			expect(yield* readProjectFile(projectDirectory, 'src/generated/tournament-rules/v2025-07-21.ts'))
				.toMatchInlineSnapshot(`
				"// Generated by pnpm rules:generate. Do not edit.

				import type { TournamentRulesDocument } from '@/lib/rules/tournament-rules-document'

				// oxfmt-ignore
				export const PDF_TOURNAMENT_RULES_2025_07_21: TournamentRulesDocument = {
				  "schemaVersion": 1,
				  "version": "2025-07-21",
				  "sections": [
				    {
				      "heading": {
				        "sequence": 1,
				        "id": "100",
				        "text": "Tournament Operations"
				      },
				      "blocks": [
				        {
				          "kind": "rules",
				          "rules": [
				            {
				              "sequence": 2,
				              "id": "100.1",
				              "label": "100.1.",
				              "content": [
				                {
				                  "kind": "paragraph",
				                  "text": "A tournament rule."
				                }
				              ],
				              "children": []
				            }
				          ]
				        }
				      ]
				    }
				  ]
				}
				"
			`)

			const exactPages = {
				'content/rules-documents/core-rules/1.2.mdx': `---
title: "Core Rules 1.2 (Spiritforged)"
sidebarTitle: "Core Rules"
icon: "Scale"
createdAt: "2025-12-01"
description: "The current Riftbound Core Rules Document as a single, hyperlinked page."
rulesDocument:
  type: "core-rules"
  version: "1.2"
noindex: true
---

<RulesDocument />
`,
				'content/rules-documents/core-rules/(archive)/1.0.mdx': `---
title: "Core Rules 1.0"
sidebarTitle: "Core Rules 1.0"
createdAt: "2025-06-02"
description: "Archived version of the Riftbound Core Rules Document: 1.0."
rulesDocument:
  type: "core-rules"
  version: "1.0"
noindex: true
---

<Callout type="warn" title="Archived reference">
	This rules document is archived and may not reflect the current rules.
	See the [current Core Rules](/rules-documents/core-rules/1.2).
</Callout>

<RulesDocument />
`,
				'content/rules-documents/core-rules/changes/1.1.mdx': `---
title: "Core Rules 1.1 Changes (Origins)"
sidebarTitle: "Origins Changes"
createdAt: "2025-10-01"
description: "Changes between Riftbound Core Rules 1.0 and 1.1 (Origins)."
noindex: true
---

Badges identify **Added**, **Changed**, and **Removed** rules.
Removed wording is struck through, while added wording is highlighted.
Each change appears with the unchanged rules needed to preserve its context; other unchanged rules are omitted.
Rule numbers open the corresponding source document in a new tab.

<CoreRulesDiff from="1.0" to="1.1" />
`,
				'content/rules-documents/tournament-rules/2026-04-29.mdx': `---
title: "Tournament Rules (April 29, 2026)"
sidebarTitle: "Tournament Rules"
icon: "Trophy"
createdAt: "2026-04-29"
description: "The current Riftbound Tournament Rules as a single, hyperlinked page."
rulesDocument:
  type: "tournament-rules"
  version: "2026-04-29"
noindex: true
---

<RulesDocument />
`,
				'content/rules-documents/tournament-rules/(archive)/2026-03-30.mdx': `---
title: "Tournament Rules (March 30, 2026)"
sidebarTitle: "March 2026 Tournament Rules"
createdAt: "2026-03-30"
description: "Archived version of the Riftbound Tournament Rules last updated March 30, 2026."
rulesDocument:
  type: "tournament-rules"
  version: "2026-03-30"
noindex: true
---

<Callout type="warn" title="Archived reference">
	This rules document is archived and may not reflect current tournament policy.
	See the [current Tournament Rules](/rules-documents/tournament-rules/2026-04-29).
</Callout>

<RulesDocument />
`,
				'content/rules-documents/tournament-rules/changes/2026-04-29.mdx': `---
title: "Tournament Rules Changes (April 29, 2026)"
sidebarTitle: "April 2026 Changes"
createdAt: "2026-04-29"
description: "Changes between the March 2026 and April 2026 Riftbound Tournament Rules."
noindex: true
---

Badges identify **Added**, **Changed**, and **Removed** rules.
Removed wording is struck through, while added wording is highlighted.
Each change appears with the unchanged rules needed to preserve its context; other unchanged rules are omitted.
Rule numbers open the corresponding source document in a new tab.

<TournamentRulesDiff
	from="2026-03-30"
	to="2026-04-29"
/>
`,
			} as const
			for (const [path, expected] of Object.entries(exactPages)) {
				expect(yield* readProjectFile(projectDirectory, path)).toBe(expected)
			}

			expect(yield* readProjectFile(projectDirectory, 'content/rules-documents/meta.json')).toBe(`{
	"title": "Rules Documents",
	"root": true,
	"icon": "Bookmark",
	"pages": [
		"---Introduction---",
		"index",
		"---Current Documents---",
		"core-rules/1.2",
		"tournament-rules/2026-04-29",
		"---Core Rules---",
		"core-rules/changes",
		"core-rules/(archive)",
		"---Tournament Rules---",
		"tournament-rules/changes",
		"tournament-rules/(archive)"
	]
}
`)
			expect(
				yield* readProjectFile(projectDirectory, 'content/rules-documents/core-rules/changes/meta.json'),
			).toContain('"pages": [\n\t\t"1.2",\n\t\t"1.1"\n\t]')
			expect(
				yield* readProjectFile(
					projectDirectory,
					'content/rules-documents/tournament-rules/(archive)/meta.json',
				),
			).toContain('"pages": [\n\t\t"2026-03-30",\n\t\t"2025-07-21"\n\t]')
			const overview = yield* readProjectFile(projectDirectory, 'content/rules-documents/index.mdx')
			expect(overview).toContain('href="/rules-documents/core-rules/1.2"')
			expect(overview).toContain('href="/rules-documents/tournament-rules/2026-04-29"')
			expect(overview).toContain('Changes from March 30 to April 29, 2026.')
		}),
	)

	it.effect('extracts Core then Tournament versions sequentially and emits diagnostics in order', () =>
		Effect.gen(function* () {
			const projectDirectory = yield* temporaryProject()
			yield* writeProjectFile(
				projectDirectory,
				'sources/rules-manifest.json',
				JSON.stringify({
					coreRules: {
						current: '1.1',
						versions: { '1.1': {}, '1.0': { name: 'Launch' } },
					},
					tournamentRules: {
						current: '2026-02-01',
						versions: { '2026-02-01': {}, '2026-01-01': {} },
					},
				}),
			)
			yield* writeProjectBytes(projectDirectory, 'sources/CR-v1.1.pdf', new Uint8Array([3]))
			yield* writeProjectBytes(
				projectDirectory,
				'sources/Tournament-Rules-2026-02-01.pdf',
				new Uint8Array([4]),
			)

			const events: string[] = []
			const pdfLayer = rulesPdfTestLayer((data) => {
				const marker = data[0]
				events.push(`load:${marker}`)
				const page =
					marker === 1 || marker === 3
						? coreRulesPage('Riftbound Core Rules', 40)
						: anomalousTournamentRulesPage(marker === 2 ? '2026-01-01' : '2026-02-01')
				return {
					promise: Promise.resolve({ numPages: 1, getPage: () => Promise.resolve(page) }),
					destroy: () => {
						events.push(`destroy:${marker}`)
						return Promise.resolve()
					},
				}
			})
			const warnings: string[] = []
			const controlledConsole: Console.Console = Object.assign(Object.create(console), {
				warn: (...args: ReadonlyArray<unknown>) => warnings.push(args.map(String).join(' ')),
			})

			yield* generateRules({ projectDirectory }).pipe(
				Effect.provide(pdfLayer),
				Effect.provideService(Console.Console, controlledConsole),
			)

			expect(events).toStrictEqual([
				'load:1',
				'destroy:1',
				'load:3',
				'destroy:3',
				'load:2',
				'destroy:2',
				'load:4',
				'destroy:4',
			])
			expect(warnings).toStrictEqual([
				'Tournament-Rules-2026-01-01.pdf: preserved structural anomalies (unnumbered-rule: 1)',
				'Tournament-Rules-2026-02-01.pdf: preserved structural anomalies (unnumbered-rule: 1)',
			])
		}),
	)

	it.effect('emits completed Tournament diagnostics before a later version fails and stops', () =>
		Effect.gen(function* () {
			const projectDirectory = yield* temporaryProject()
			yield* writeProjectFile(
				projectDirectory,
				'sources/rules-manifest.json',
				JSON.stringify({
					coreRules: { current: '1.0', versions: { '1.0': { name: 'Launch' } } },
					tournamentRules: {
						current: '2026-03-01',
						versions: { '2026-03-01': {}, '2026-02-01': {}, '2026-01-01': {} },
					},
				}),
			)
			yield* writeProjectBytes(
				projectDirectory,
				'sources/Tournament-Rules-2026-02-01.pdf',
				new Uint8Array([4]),
			)
			yield* writeProjectBytes(
				projectDirectory,
				'sources/Tournament-Rules-2026-03-01.pdf',
				new Uint8Array([5]),
			)

			const loads: number[] = []
			const pdfLayer = rulesPdfTestLayer((data) => {
				const marker = data[0]
				loads.push(marker)
				if (marker === 4) throw new Error('controlled later-version failure')
				const page = marker === 1 ? coreRulesPage() : anomalousTournamentRulesPage('2026-01-01')
				return {
					promise: Promise.resolve({ numPages: 1, getPage: () => Promise.resolve(page) }),
					destroy: () => Promise.resolve(),
				}
			})
			const warnings: string[] = []
			const controlledConsole: Console.Console = Object.assign(Object.create(console), {
				warn: (...args: ReadonlyArray<unknown>) => warnings.push(args.map(String).join(' ')),
			})

			const error = yield* Effect.flip(
				generateRules({ projectDirectory }).pipe(
					Effect.provide(pdfLayer),
					Effect.provideService(Console.Console, controlledConsole),
				),
			)

			expect(error).toMatchObject({
				stage: 'tournament-rules',
				context: { family: 'tournament-rules', version: '2026-02-01' },
			})
			expect(loads).toStrictEqual([1, 2, 4])
			expect(warnings).toStrictEqual([
				'Tournament-Rules-2026-01-01.pdf: preserved structural anomalies (unnumbered-rule: 1)',
			])
		}),
	)

	it.effect('rejects partial Tournament Rules strikeouts with page context', () =>
		Effect.gen(function* () {
			const projectDirectory = yield* temporaryProject()

			const error = yield* Effect.flip(
				generateRules({ projectDirectory }).pipe(
					Effect.provide(rulesPdfLayer({ tournament: partiallyStruckTournamentRulesPage() })),
				),
			)

			expect(error).toBeInstanceOf(RulesGenerationError)
			expect(error).toMatchObject({
				stage: 'tournament-rules',
				context: { family: 'tournament-rules', version: '2026-01-01', page: 1 },
			})
			expect(error.message).toMatch(/partial strikeout on page 1 requires manual review/u)
		}),
	)

	it.effect('rebuilds complete owned output while preserving unrelated shared files', () =>
		Effect.gen(function* () {
			const fileSystem = yield* FileSystem.FileSystem
			const pathService = yield* Path.Path
			const projectDirectory = yield* temporaryProject()
			yield* writeProjectFile(projectDirectory, 'artifacts/rules/transcripts/stale.txt', 'stale')
			yield* writeProjectFile(projectDirectory, 'src/generated/core-rules/stale.ts', 'stale')
			yield* writeProjectFile(projectDirectory, 'src/generated/tournament-rules/stale.ts', 'stale')
			yield* writeProjectFile(projectDirectory, 'content/rules-documents/stale.mdx', 'stale')
			yield* writeProjectFile(projectDirectory, 'src/generated/unrelated.ts', 'preserved')
			yield* writeProjectFile(projectDirectory, 'content/unrelated.mdx', 'preserved')
			yield* writeProjectFile(projectDirectory, 'sources/notes.txt', 'preserved')
			yield* writeProjectFile(projectDirectory, 'sources/CR-v1.99.txt', 'preserved')
			yield* writeProjectFile(projectDirectory, 'sources/card-catalog.json', 'preserved')
			yield* writeProjectFile(projectDirectory, 'sources/card-errata.json', 'preserved')
			yield* writeProjectFile(projectDirectory, 'sources/card-gallery-data.json', 'preserved')
			yield* writeProjectFile(projectDirectory, 'src/generated/rules-metadata.ts', 'retired')
			yield* writeProjectFile(projectDirectory, 'content/reference/index.mdx', 'retired')

			const summary = yield* generateRules({ projectDirectory }).pipe(Effect.provide(rulesPdfLayer()))

			expect(summary).toStrictEqual({
				coreRules: { current: '1.0', versions: 1, transcripts: 1 },
				tournamentRules: { current: '2026-01-01', versions: 1, transcripts: 1 },
				reference: { pages: 3 },
			})
			yield* expectCompleteGeneratedOutput(projectDirectory)
			expect(
				yield* fileSystem.readFileString(
					pathService.join(projectDirectory, 'artifacts/rules/transcripts/CR-v1.0.txt'),
				),
			).toBe('Riftbound Core Rules\nLast Updated: 2026-01-01\n100. Game Concepts\n100.1. A generated rule.\n')
			expect(
				yield* fileSystem.readFileString(
					pathService.join(projectDirectory, 'artifacts/rules/transcripts/Tournament-Rules-2026-01-01.txt'),
				),
			).toBe(
				'Riftbound Tournament Rules\nLast Updated: 2026-01-01\n100. Tournament Operations\n100.1. A tournament rule.\n',
			)
			for (const path of [
				'artifacts/rules/transcripts/stale.txt',
				'src/generated/rules-metadata.ts',
				'content/reference',
			]) {
				expect(yield* fileSystem.exists(pathService.join(projectDirectory, path))).toBe(false)
			}
			for (const path of [
				'src/generated/unrelated.ts',
				'content/unrelated.mdx',
				'sources/notes.txt',
				'sources/CR-v1.99.txt',
				'sources/card-catalog.json',
				'sources/card-errata.json',
				'sources/card-gallery-data.json',
			]) {
				expect(yield* fileSystem.readFileString(pathService.join(projectDirectory, path))).toBe('preserved')
			}
			const stablePaths = [
				'artifacts/rules/transcripts/CR-v1.0.txt',
				'src/generated/core-rules/index.ts',
				'content/rules-documents/index.mdx',
			]
			const firstGeneration = yield* Effect.forEach(stablePaths, (path) =>
				fileSystem.readFileString(pathService.join(projectDirectory, path)),
			)

			yield* generateRules({ projectDirectory }).pipe(Effect.provide(rulesPdfLayer()))

			expect(
				yield* Effect.forEach(stablePaths, (path) =>
					fileSystem.readFileString(pathService.join(projectDirectory, path)),
				),
			).toStrictEqual(firstGeneration)
		}),
	)

	it.effect('removes generated output for a version removed from authoritative inputs', () =>
		Effect.gen(function* () {
			const fileSystem = yield* FileSystem.FileSystem
			const pathService = yield* Path.Path
			const projectDirectory = yield* temporaryProject()
			const removedVersionPath = pathService.join(
				projectDirectory,
				'content/rules-documents/core-rules/(archive)/1.9.mdx',
			)
			yield* writeProjectFile(
				projectDirectory,
				'content/rules-documents/core-rules/(archive)/1.9.mdx',
				'previously generated version',
			)

			yield* generateRules({ projectDirectory }).pipe(Effect.provide(rulesPdfLayer()))

			expect(yield* fileSystem.exists(removedVersionPath)).toBe(false)
		}),
	)

	it.effect('leaves prior output unchanged when manifest parsing fails', () =>
		Effect.gen(function* () {
			const fileSystem = yield* FileSystem.FileSystem
			const pathService = yield* Path.Path
			const projectDirectory = yield* temporaryProject()
			yield* writeProjectFile(projectDirectory, 'src/generated/core-rules/prior.ts', 'prior core')
			yield* writeProjectFile(projectDirectory, 'artifacts/rules/transcripts/CR-v1.0.txt', 'prior transcript')
			yield* writeProjectFile(projectDirectory, 'sources/rules-manifest.json', 'not JSON')

			const error = yield* Effect.flip(
				generateRules({ projectDirectory }).pipe(Effect.provide(rulesPdfLayer())),
			)

			expect(error).toBeInstanceOf(RulesGenerationError)
			expect(error).toMatchObject({
				stage: 'manifest',
				context: {
					kind: 'input',
					path: pathService.join(projectDirectory, 'sources/rules-manifest.json'),
				},
			})
			expect(
				yield* fileSystem.readFileString(
					pathService.join(projectDirectory, 'src/generated/core-rules/prior.ts'),
				),
			).toBe('prior core')
			expect(
				yield* fileSystem.readFileString(
					pathService.join(projectDirectory, 'artifacts/rules/transcripts/CR-v1.0.txt'),
				),
			).toBe('prior transcript')
		}),
	)

	it.effect('leaves prior output unchanged when PDF extraction fails', () =>
		Effect.gen(function* () {
			const fileSystem = yield* FileSystem.FileSystem
			const pathService = yield* Path.Path
			const projectDirectory = yield* temporaryProject()
			yield* writeProjectFile(projectDirectory, 'content/rules-documents/prior.mdx', 'prior content')
			const failedPdfLayer = rulesPdfTestLayer(() => {
				throw new Error('controlled PDF failure')
			})

			const error = yield* Effect.flip(
				generateRules({ projectDirectory }).pipe(Effect.provide(failedPdfLayer)),
			)

			expect(error).toBeInstanceOf(RulesGenerationError)
			expect(error).toMatchObject({
				stage: 'core-rules',
				context: {
					kind: 'input',
					family: 'core-rules',
					version: '1.0',
					path: pathService.join(projectDirectory, 'sources/CR-v1.0.pdf'),
				},
			})
			expect(
				yield* fileSystem.readFileString(
					pathService.join(projectDirectory, 'content/rules-documents/prior.mdx'),
				),
			).toBe('prior content')
		}),
	)

	it.effect('leaves prior output unchanged when extracted source validation fails', () =>
		Effect.gen(function* () {
			const fileSystem = yield* FileSystem.FileSystem
			const pathService = yield* Path.Path
			const projectDirectory = yield* temporaryProject()
			yield* writeProjectFile(projectDirectory, 'src/generated/core-rules/prior.ts', 'prior')

			const error = yield* Effect.flip(
				generateRules({ projectDirectory }).pipe(
					Effect.provide(rulesPdfLayer({ core: coreRulesPage('Unexpected document') })),
				),
			)

			expect(error).toBeInstanceOf(RulesGenerationError)
			expect(error).toMatchObject({
				stage: 'core-rules',
				context: { kind: 'input', family: 'core-rules', version: '1.0' },
			})
			expect(
				yield* fileSystem.readFileString(
					pathService.join(projectDirectory, 'src/generated/core-rules/prior.ts'),
				),
			).toBe('prior')
		}),
	)

	it.effect('leaves prior output unchanged when structuring defects', () =>
		Effect.gen(function* () {
			const fileSystem = yield* FileSystem.FileSystem
			const pathService = yield* Path.Path
			const projectDirectory = yield* temporaryProject()
			yield* writeProjectFile(projectDirectory, 'content/rules-documents/prior.mdx', 'prior')
			const tournamentPage = tournamentRulesPage()
			const unstructuredTournamentPage: PdfJsPage = {
				...tournamentPage,
				getTextContent: () =>
					Promise.resolve({
						items: [
							textItem('Riftbound Tournament Rules', 80, 760, 16),
							textItem('Last Updated: 1/1/2026', 80, 740),
							textItem('An orphaned rule.', 130, 150),
						],
					}),
			}

			const exit = yield* Effect.exit(
				generateRules({ projectDirectory }).pipe(
					Effect.provide(rulesPdfLayer({ tournament: unstructuredTournamentPage })),
				),
			)

			if (Exit.isSuccess(exit)) throw new Error('Expected Tournament Rules structuring to fail')
			expect(Cause.hasDies(exit.cause)).toBe(true)
			expect(
				yield* fileSystem.readFileString(
					pathService.join(projectDirectory, 'content/rules-documents/prior.mdx'),
				),
			).toBe('prior')
		}),
	)

	it.effect('leaves prior output unchanged when a template cannot be read', () =>
		Effect.gen(function* () {
			const fileSystem = yield* FileSystem.FileSystem
			const pathService = yield* Path.Path
			const projectDirectory = yield* temporaryProject()
			yield* writeProjectFile(projectDirectory, 'src/generated/tournament-rules/prior.ts', 'prior')
			yield* fileSystem.remove(
				pathService.join(projectDirectory, 'scripts/rules/templates/core-rules-current.mdx'),
			)

			const error = yield* Effect.flip(
				generateRules({ projectDirectory }).pipe(Effect.provide(rulesPdfLayer())),
			)

			expect(error).toBeInstanceOf(RulesGenerationError)
			expect(error).toMatchObject({ stage: 'rules-documents', context: { kind: 'input' } })
			expect(error.message).toMatch(
				/^Rules-document generation failed: Reference publication templates could not be loaded:/u,
			)
			expect(
				yield* fileSystem.readFileString(
					pathService.join(projectDirectory, 'src/generated/tournament-rules/prior.ts'),
				),
			).toBe('prior')
		}),
	)

	it.effect('validates templates before PDF extraction and leaves prior output unchanged', () =>
		Effect.gen(function* () {
			const fileSystem = yield* FileSystem.FileSystem
			const pathService = yield* Path.Path
			const projectDirectory = yield* temporaryProject()
			yield* writeProjectFile(projectDirectory, 'src/generated/tournament-rules/prior.ts', 'prior')
			yield* writeProjectFile(
				projectDirectory,
				'scripts/rules/templates/core-rules-current.mdx',
				'invalid template',
			)
			const loads: number[] = []
			const pdfLayer = rulesPdfTestLayer((data) => {
				loads.push(data[0])
				const page = data[0] === CORE_RULES_PDF_MARKER ? coreRulesPage() : tournamentRulesPage()
				return {
					promise: Promise.resolve({ numPages: 1, getPage: () => Promise.resolve(page) }),
					destroy: () => Promise.resolve(),
				}
			})

			const error = yield* Effect.flip(generateRules({ projectDirectory }).pipe(Effect.provide(pdfLayer)))

			expect(error).toBeInstanceOf(RulesGenerationError)
			expect(error).toMatchObject({ stage: 'rules-documents' })
			expect(error.message).toMatch(
				/^Rules-document generation failed: Reference publication could not be rendered:/u,
			)
			expect(loads).toStrictEqual([])
			expect(
				yield* fileSystem.readFileString(
					pathService.join(projectDirectory, 'src/generated/tournament-rules/prior.ts'),
				),
			).toBe('prior')
		}),
	)

	it.effect('rejects unresolved placeholders introduced by manifest values before mutation', () =>
		Effect.gen(function* () {
			const projectDirectory = yield* temporaryProject()
			yield* writeProjectFile(projectDirectory, 'content/rules-documents/prior.mdx', 'prior')
			yield* writeProjectFile(
				projectDirectory,
				'sources/rules-manifest.json',
				JSON.stringify({
					coreRules: { current: '1.0', versions: { '1.0': { name: '{{UNKNOWN}}' } } },
					tournamentRules: { current: '2026-01-01', versions: { '2026-01-01': {} } },
				}),
			)

			const error = yield* Effect.flip(
				generateRules({ projectDirectory }).pipe(Effect.provide(rulesPdfLayer())),
			)

			expect(error).toMatchObject({ stage: 'rules-documents' })
			expect(error.message).toMatch(/core-rules-current\.mdx: unresolved placeholders \{\{UNKNOWN\}\}/u)
			expect(yield* readProjectFile(projectDirectory, 'content/rules-documents/prior.mdx')).toBe('prior')
		}),
	)

	it.effect('leaves prior output unchanged when a rendered rules page has no document marker', () =>
		Effect.gen(function* () {
			const projectDirectory = yield* temporaryProject()
			yield* writeProjectFile(projectDirectory, 'content/rules-documents/prior.mdx', 'prior')
			yield* writeProjectFile(
				projectDirectory,
				'scripts/rules/templates/core-rules-current.mdx',
				'---\ntitle: "{{TITLE}}"\ncreatedAt: "{{CREATED_AT}}"\n{{RULES_DOCUMENT_FRONTMATTER}}\n---\n',
			)

			const error = yield* Effect.flip(
				generateRules({ projectDirectory }).pipe(Effect.provide(rulesPdfLayer())),
			)

			expect(error).toMatchObject({ stage: 'rules-documents' })
			expect(error.message).toMatch(
				/^Rules-document generation failed: Reference publication artifacts are invalid:/u,
			)
			expect(error.message).toMatch(/must contain one <RulesDocument \/>/u)
			expect(yield* readProjectFile(projectDirectory, 'content/rules-documents/prior.mdx')).toBe('prior')
		}),
	)

	it.effect('validates every output path before mutating prior output', () =>
		Effect.gen(function* () {
			const fileSystem = yield* FileSystem.FileSystem
			const pathService = yield* Path.Path
			const projectDirectory = yield* temporaryProject()
			yield* writeProjectFile(projectDirectory, 'src/generated/core-rules/prior.ts', 'prior')
			const controlledPath = Path.Path.of({
				...pathService,
				resolveWithin: (root, input) =>
					input === 'src/generated/core-rules/index.ts'
						? Option.none()
						: pathService.resolveWithin(root, input),
			})

			const error = yield* Effect.flip(
				generateRules({ projectDirectory }).pipe(
					Effect.provide(rulesPdfLayer()),
					Effect.provideService(Path.Path, controlledPath),
				),
			)

			expect(error).toBeInstanceOf(RulesGenerationError)
			expect(error).toMatchObject({ stage: 'output-validation' })
			expect(error.message).toMatch(/escapes the project/u)
			expect(
				yield* fileSystem.readFileString(
					pathService.join(projectDirectory, 'src/generated/core-rules/prior.ts'),
				),
			).toBe('prior')
		}),
	)

	it.effect('rejects colliding output destinations before mutating prior output', () =>
		Effect.gen(function* () {
			const fileSystem = yield* FileSystem.FileSystem
			const pathService = yield* Path.Path
			const projectDirectory = yield* temporaryProject()
			yield* writeProjectFile(projectDirectory, 'content/rules-documents/prior.mdx', 'prior')
			const controlledPath = Path.Path.of({
				...pathService,
				resolveWithin: (root, input) =>
					pathService.resolveWithin(
						root,
						input === 'src/generated/core-rules/v1-0.ts' ? 'src/generated/core-rules/index.ts' : input,
					),
			})

			const error = yield* Effect.flip(
				generateRules({ projectDirectory }).pipe(
					Effect.provide(rulesPdfLayer()),
					Effect.provideService(Path.Path, controlledPath),
				),
			)

			expect(error).toBeInstanceOf(RulesGenerationError)
			expect(error).toMatchObject({ stage: 'output-validation' })
			expect(error.message).toMatch(/Duplicate generated output destination/u)
			expect(
				yield* fileSystem.readFileString(
					pathService.join(projectDirectory, 'content/rules-documents/prior.mdx'),
				),
			).toBe('prior')
		}),
	)

	it.effect('repairs partial owned output on the next run after a write failure', () =>
		Effect.gen(function* () {
			const fileSystem = yield* FileSystem.FileSystem
			const pathService = yield* Path.Path
			const projectDirectory = yield* temporaryProject()
			for (const path of [
				'src/generated/core-rules/prior.ts',
				'src/generated/tournament-rules/prior.ts',
				'content/rules-documents/prior.mdx',
			]) {
				yield* writeProjectFile(projectDirectory, path, 'prior')
			}
			const failedPath = pathService.join(projectDirectory, 'src/generated/tournament-rules/index.ts')
			let writeFailed = false
			const controlledFileSystem = FileSystem.FileSystem.of({
				...fileSystem,
				writeFileString: (path, contents, options) => {
					if (path !== failedPath) return fileSystem.writeFileString(path, contents, options)
					writeFailed = true
					return fileSystem.writeFileString(
						pathService.join(projectDirectory, 'missing-parent', 'write-failure'),
						contents,
						options,
					)
				},
			})

			yield* Effect.flip(
				generateRules({ projectDirectory }).pipe(
					Effect.provide(rulesPdfLayer()),
					Effect.provideService(FileSystem.FileSystem, controlledFileSystem),
				),
			)

			expect(writeFailed).toBe(true)
			expect(
				yield* fileSystem.exists(pathService.join(projectDirectory, 'content/rules-documents/index.mdx')),
			).toBe(true)
			expect(yield* fileSystem.exists(failedPath)).toBe(false)
			expect(
				yield* fileSystem.exists(pathService.join(projectDirectory, 'src/generated/core-rules/prior.ts')),
			).toBe(false)

			yield* generateRules({ projectDirectory }).pipe(Effect.provide(rulesPdfLayer()))

			yield* expectCompleteGeneratedOutput(projectDirectory)
		}),
	)
})
