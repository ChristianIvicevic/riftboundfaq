import * as NodeServices from '@effect/platform-node/NodeServices'
import { expect, layer } from '@effect/vitest'
import { Effect } from 'effect'
import * as FileSystem from 'effect/FileSystem'
import * as Path from 'effect/Path'
import { OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { vi } from 'vitest'
import { testLayer } from '../pdf'
import { inspectTournamentPdf } from './extract'

function textItem(str: string, x: number, y: number, size = 8, width = str.length * 4) {
	return { str, transform: [size, 0, 0, size, x, y], width, height: size }
}

function tableOperators() {
	return {
		fnArray: [OPS.setFillRGBColor, OPS.constructPath, OPS.constructPath],
		argsArray: [
			[0.8, 0.8, 0.8],
			[OPS.fill, null, [36, 200, 575, 201]],
			[OPS.fill, null, [36, 100, 575, 101]],
		],
	}
}

layer(NodeServices.layer)('Tournament Rules inspection', (it) => {
	it.effect('processes pages sequentially while retaining cross-page rows', () =>
		Effect.gen(function* () {
			const fileSystem = yield* FileSystem.FileSystem
			const pathService = yield* Path.Path
			const temporaryDirectory = yield* fileSystem.makeTempDirectoryScoped()
			const sourcePath = pathService.join(temporaryDirectory, 'Tournament-Rules-2026-01-02.pdf')
			const sourceBytes = new Uint8Array([1, 2, 3])
			yield* fileSystem.writeFile(sourcePath, sourceBytes)

			const events: string[] = []
			const firstPage = {
				view: [0, 0, 600, 800],
				getTextContent: vi.fn(() =>
					Promise.resolve({
						items: [
							textItem('Riftbound Tournament Rules', 80, 760, 16),
							textItem('Last Updated: 1/2/2026', 80, 740),
							textItem('100.1.', 40, 150),
							textItem('Text before the break', 130, 150),
						],
					}),
				),
				getOperatorList: vi.fn(() => Promise.resolve(tableOperators())),
				cleanup: vi.fn(() => {
					events.push('cleanup:1')
				}),
			}
			const secondPage = {
				view: [0, 0, 600, 800],
				getTextContent: vi.fn(() => Promise.resolve({ items: [textItem('and after it.', 130, 150)] })),
				getOperatorList: vi.fn(() => Promise.resolve(tableOperators())),
				cleanup: vi.fn(() => {
					events.push('cleanup:2')
				}),
			}
			const document = {
				numPages: 2,
				getPage: vi.fn((page: number) => {
					events.push(`acquire:${page}`)
					return Promise.resolve(page === 1 ? firstPage : secondPage)
				}),
			}
			const destroy = vi.fn(() => {
				events.push('destroy')
				return Promise.resolve()
			})
			const load = vi.fn(() => ({ promise: Promise.resolve(document), destroy }))

			const report = yield* inspectTournamentPdf(sourcePath).pipe(Effect.provide(testLayer(load)))

			expect(report).toMatchObject({
				file: 'Tournament-Rules-2026-01-02.pdf',
				version: '2026-01-02',
				bytes: 3,
				pages: 2,
				title: 'Riftbound Tournament Rules',
				lastUpdated: '2026-01-02',
				physicalLineCount: 4,
				rowCount: 1,
				crossPageJoins: 1,
			})
			expect(report.rows[0]).toMatchObject({
				id: '100.1',
				text: 'Text before the break and after it.',
				continuation: true,
				source: { startPage: 1, endPage: 2 },
			})
			expect(events).toStrictEqual(['acquire:1', 'cleanup:1', 'acquire:2', 'cleanup:2', 'destroy'])
			expect(firstPage.getTextContent).toHaveBeenCalledOnce()
			expect(firstPage.getOperatorList).toHaveBeenCalledOnce()
			expect(secondPage.getTextContent).toHaveBeenCalledOnce()
			expect(secondPage.getOperatorList).toHaveBeenCalledOnce()
			expect(load).toHaveBeenCalledExactlyOnceWith(sourceBytes)
		}),
	)
})
