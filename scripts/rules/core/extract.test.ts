import * as NodeServices from '@effect/platform-node/NodeServices'
import { expect, layer } from '@effect/vitest'
import { Cause, Effect, Exit, Fiber } from 'effect'
import * as FileSystem from 'effect/FileSystem'
import * as Path from 'effect/Path'
import { vi } from 'vitest'
import { testLayer } from '../pdf'
import { inspectCoreRulesPdf } from './extract'

function textItem(str: string, x: number, y: number, size = 8, width = str.length * 4) {
	return { str, transform: [size, 0, 0, size, x, y], width, height: size }
}

function assertFailureExit<A, E>(exit: Exit.Exit<A, E>): Cause.Cause<E> {
	if (Exit.isSuccess(exit)) throw new Error('Expected Core Rules inspection to fail')
	return exit.cause
}

layer(NodeServices.layer)('Core Rules inspection', (it) => {
	it.effect('processes pages sequentially while retaining cross-page rules', () =>
		Effect.gen(function* () {
			const fileSystem = yield* FileSystem.FileSystem
			const pathService = yield* Path.Path
			const temporaryDirectory = yield* fileSystem.makeTempDirectoryScoped()
			const sourcePath = pathService.join(temporaryDirectory, 'CR-v1.0.pdf')
			const sourceBytes = new Uint8Array([1, 2, 3])
			yield* fileSystem.writeFile(sourcePath, sourceBytes)

			const events: string[] = []
			const firstPage = {
				view: [0, 0, 600, 800],
				getTextContent: vi.fn(() => {
					events.push('extract:1')
					return Promise.resolve({
						items: [
							textItem('Riftbound Core Rules', 80, 760, 16),
							textItem('Last Updated: 2026-01-01', 80, 740),
							textItem('100.', 20, 700, 20, 35),
							textItem('Game Concepts', 80, 700, 20, 130),
							textItem('100.1.', 20, 660, 8, 35),
							textItem('First sentence.', 80, 660, 8, 55),
						],
					})
				}),
				getOperatorList: vi.fn(() => Promise.resolve({ fnArray: [], argsArray: [] })),
				cleanup: vi.fn(() => {
					events.push('cleanup:1')
				}),
			}
			const secondPage = {
				view: [0, 0, 600, 800],
				getTextContent: vi.fn(() => {
					events.push('extract:2')
					return Promise.resolve({ items: [textItem('Continued sentence.', 80, 740, 8, 75)] })
				}),
				getOperatorList: vi.fn(() => Promise.resolve({ fnArray: [], argsArray: [] })),
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

			const report = yield* inspectCoreRulesPdf(sourcePath).pipe(Effect.provide(testLayer(load)))

			expect(report).toMatchObject({
				file: 'CR-v1.0.pdf',
				bytes: 3,
				pages: 2,
				title: 'Riftbound Core Rules',
				lastUpdated: '2026-01-01',
				physicalLineCount: 5,
				crossPageBlocks: 1,
			})
			expect(report.records[1]).toMatchObject({
				id: '100.1',
				lines: [{ kind: 'paragraph', text: 'First sentence. Continued sentence.' }],
				source: { startPage: 1, startLine: 4, endPage: 2, endLine: 1 },
			})
			expect(events).toStrictEqual([
				'acquire:1',
				'extract:1',
				'cleanup:1',
				'acquire:2',
				'extract:2',
				'cleanup:2',
				'destroy',
			])
			expect(load).toHaveBeenCalledExactlyOnceWith(sourceBytes)
		}),
	)

	it.effect('releases the active page and loading task when inspection is interrupted', () =>
		Effect.gen(function* () {
			const fileSystem = yield* FileSystem.FileSystem
			const pathService = yield* Path.Path
			const temporaryDirectory = yield* fileSystem.makeTempDirectoryScoped()
			const sourcePath = pathService.join(temporaryDirectory, 'CR-v1.0.pdf')
			yield* fileSystem.writeFile(sourcePath, new Uint8Array([1]))

			const extractionStarted = Promise.withResolvers<void>()
			const textContent = Promise.withResolvers<Readonly<{ items: readonly unknown[] }>>()
			const cleanup = vi.fn()
			const page = {
				view: [0, 0, 600, 800],
				getTextContent: vi.fn(() => {
					extractionStarted.resolve()
					return textContent.promise
				}),
				getOperatorList: vi.fn(() => Promise.resolve({ fnArray: [], argsArray: [] })),
				cleanup,
			}
			const document = { numPages: 1, getPage: vi.fn(() => Promise.resolve(page)) }
			const destroy = vi.fn(() => Promise.resolve())
			const load = vi.fn(() => ({ promise: Promise.resolve(document), destroy }))
			const inspection = inspectCoreRulesPdf(sourcePath).pipe(Effect.provide(testLayer(load)))
			const fiber = yield* Effect.forkChild(inspection, { startImmediately: true })
			yield* Effect.promise(() => extractionStarted.promise)

			yield* Fiber.interrupt(fiber)
			const exit = yield* Fiber.await(fiber)

			expect(Cause.hasInterruptsOnly(assertFailureExit(exit))).toBe(true)
			expect(cleanup).toHaveBeenCalledOnce()
			expect(destroy).toHaveBeenCalledOnce()
		}),
	)
})
