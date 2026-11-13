import { expect, it } from '@effect/vitest'
import { Cause, Effect, Exit, Fiber, Result } from 'effect'
import { vi } from 'vitest'
import { layerTest, RulesPdf, RulesPdfError } from './pdf'

function assertFailureExit<A, E>(exit: Exit.Exit<A, E>): Cause.Cause<E> {
	if (Exit.isSuccess(exit)) throw new Error('Expected PDF operation to fail')
	return exit.cause
}

it.effect('extracts plain page data and releases the page and loading task', () =>
	Effect.gen(function* () {
		const textItem = {
			str: 'Riftbound',
			transform: [8, 0, 0, 8, 24, 700],
			width: 36,
			height: 8,
		}
		const cleanup = vi.fn()
		const page = {
			view: [0, 0, 612, 792],
			getTextContent: vi.fn(() => Promise.resolve({ items: [textItem] })),
			getOperatorList: vi.fn(() => Promise.resolve({ fnArray: [], argsArray: [] })),
			cleanup,
		}
		const document = { numPages: 1, getPage: vi.fn(() => Promise.resolve(page)) }
		const destroy = vi.fn(() => Promise.resolve())
		const loadingTask = { promise: Promise.resolve(document), destroy }
		const load = vi.fn(() => loadingTask)
		const data = new Uint8Array([1, 2, 3])

		const extracted = yield* Effect.gen(function* () {
			const pdf = yield* RulesPdf
			return yield* pdf.withDocument({ path: '/rules/core.pdf', data }, (pdfDocument) =>
				pdfDocument.extractTextPage(1),
			)
		}).pipe(Effect.provide(layerTest(load)))

		expect(extracted).toStrictEqual({ page: 1, width: 612, items: [textItem] })
		expect(load).toHaveBeenCalledExactlyOnceWith(data)
		expect(document.getPage).toHaveBeenCalledExactlyOnceWith(1)
		expect(page.getTextContent).toHaveBeenCalledOnce()
		expect(page.getOperatorList).not.toHaveBeenCalled()
		expect(cleanup).toHaveBeenCalledOnce()
		expect(destroy).toHaveBeenCalledOnce()
	}),
)

it.effect('extracts text and operators concurrently as plain page data', () =>
	Effect.gen(function* () {
		const textContent = Promise.withResolvers<Readonly<{ items: readonly unknown[] }>>()
		const operatorList =
			Promise.withResolvers<Readonly<{ fnArray: readonly number[]; argsArray: readonly unknown[][] }>>()
		const bothExtractionsStarted = Promise.withResolvers<void>()
		let extractionStarts = 0
		const extractionStarted = () => {
			extractionStarts++
			if (extractionStarts === 2) bothExtractionsStarted.resolve()
		}
		const cleanup = vi.fn()
		const page = {
			view: [0, 0, 540, 720],
			getTextContent: vi.fn(() => {
				extractionStarted()
				return textContent.promise
			}),
			getOperatorList: vi.fn(() => {
				extractionStarted()
				return operatorList.promise
			}),
			cleanup,
		}
		const document = { numPages: 1, getPage: vi.fn(() => Promise.resolve(page)) }
		const destroy = vi.fn(() => Promise.resolve())
		const load = vi.fn(() => ({ promise: Promise.resolve(document), destroy }))

		const extraction = Effect.gen(function* () {
			const pdf = yield* RulesPdf
			return yield* pdf.withDocument(
				{ path: '/rules/tournament.pdf', data: new Uint8Array([4]) },
				(pdfDocument) => pdfDocument.extractTextAndOperatorsPage(1),
			)
		}).pipe(Effect.provide(layerTest(load)))
		const fiber = yield* Effect.forkChild(extraction)
		yield* Effect.promise(() => bothExtractionsStarted.promise)
		textContent.resolve({ items: [{ str: 'Tournament Rules' }] })
		operatorList.resolve({ fnArray: [12], argsArray: [[1, 2, 3]] })

		const extracted = yield* Fiber.join(fiber)

		expect(extracted).toStrictEqual({
			page: 1,
			width: 540,
			items: [{ str: 'Tournament Rules' }],
			operators: { fnArray: [12], argsArray: [[1, 2, 3]] },
		})
		expect(page.getTextContent).toHaveBeenCalledOnce()
		expect(page.getOperatorList).toHaveBeenCalledOnce()
		expect(cleanup).toHaveBeenCalledOnce()
		expect(destroy).toHaveBeenCalledOnce()
	}),
)

it.effect('reports loading-task creation failures with source context', () =>
	Effect.gen(function* () {
		const cause = new Error('loader crashed')
		const load = vi.fn(() => {
			throw cause
		})

		const error = yield* Effect.flip(
			Effect.gen(function* () {
				const pdf = yield* RulesPdf
				return yield* pdf.withDocument(
					{ path: '/rules/broken.pdf', data: new Uint8Array([1]) },
					() => Effect.void,
				)
			}).pipe(Effect.provide(layerTest(load))),
		)

		expect(error).toBeInstanceOf(RulesPdfError)
		expect(error).toMatchObject({
			path: '/rules/broken.pdf',
			operation: 'create-loading-task',
			cause,
		})
		expect(error.page).toBeUndefined()
		expect(error.message).toContain('/rules/broken.pdf')
	}),
)

it.effect('retains a non-stringifiable PDF.js failure as a typed error', () =>
	Effect.gen(function* () {
		const cause: unknown = Object.create(null)
		const load = vi.fn(() => {
			throw cause
		})

		const exit = yield* Effect.gen(function* () {
			const pdf = yield* RulesPdf
			return yield* pdf.withDocument(
				{ path: '/rules/unprintable.pdf', data: new Uint8Array([1]) },
				() => Effect.void,
			)
		}).pipe(Effect.provide(layerTest(load)), Effect.exit)

		const error = Result.getOrThrow(Cause.findError(assertFailureExit(exit)))
		expect(error).toBeInstanceOf(RulesPdfError)
		expect(error).toMatchObject({
			path: '/rules/unprintable.pdf',
			operation: 'create-loading-task',
			cause,
		})
	}),
)

it.effect('destroys the loading task after document initialization rejects', () =>
	Effect.gen(function* () {
		const cause = new Error('invalid PDF')
		const destroy = vi.fn(() => Promise.resolve())
		const load = vi.fn(() => ({ promise: Promise.reject(cause), destroy }))

		const error = yield* Effect.flip(
			Effect.gen(function* () {
				const pdf = yield* RulesPdf
				return yield* pdf.withDocument(
					{ path: '/rules/invalid.pdf', data: new Uint8Array([2]) },
					() => Effect.void,
				)
			}).pipe(Effect.provide(layerTest(load))),
		)

		expect(error).toBeInstanceOf(RulesPdfError)
		expect(error).toMatchObject({
			path: '/rules/invalid.pdf',
			operation: 'initialize-document',
			cause,
		})
		expect(destroy).toHaveBeenCalledOnce()
	}),
)

it.effect('destroys the loading task when page acquisition rejects', () =>
	Effect.gen(function* () {
		const cause = new Error('missing page')
		const document = { numPages: 2, getPage: vi.fn(() => Promise.reject(cause)) }
		const destroy = vi.fn(() => Promise.resolve())
		const load = vi.fn(() => ({ promise: Promise.resolve(document), destroy }))

		const error = yield* Effect.flip(
			Effect.gen(function* () {
				const pdf = yield* RulesPdf
				return yield* pdf.withDocument(
					{ path: '/rules/pages.pdf', data: new Uint8Array([3]) },
					(pdfDocument) => pdfDocument.extractTextPage(2),
				)
			}).pipe(Effect.provide(layerTest(load))),
		)

		expect(error).toBeInstanceOf(RulesPdfError)
		expect(error).toMatchObject({
			path: '/rules/pages.pdf',
			operation: 'acquire-page',
			page: 2,
			cause,
		})
		expect(document.getPage).toHaveBeenCalledExactlyOnceWith(2)
		expect(destroy).toHaveBeenCalledOnce()
	}),
)

it.effect('cleans the page and destroys the loading task when text extraction rejects', () =>
	Effect.gen(function* () {
		const cause = new Error('text unavailable')
		const cleanup = vi.fn()
		const page = {
			view: [0, 0, 600, 800],
			getTextContent: vi.fn(() => Promise.reject(cause)),
			getOperatorList: vi.fn(() => Promise.resolve({ fnArray: [], argsArray: [] })),
			cleanup,
		}
		const document = { numPages: 1, getPage: vi.fn(() => Promise.resolve(page)) }
		const destroy = vi.fn(() => Promise.resolve())
		const load = vi.fn(() => ({ promise: Promise.resolve(document), destroy }))

		const error = yield* Effect.flip(
			Effect.gen(function* () {
				const pdf = yield* RulesPdf
				return yield* pdf.withDocument(
					{ path: '/rules/text.pdf', data: new Uint8Array([4]) },
					(pdfDocument) => pdfDocument.extractTextPage(1),
				)
			}).pipe(Effect.provide(layerTest(load))),
		)

		expect(error).toBeInstanceOf(RulesPdfError)
		expect(error).toMatchObject({ operation: 'extract-text', page: 1, cause })
		expect(cleanup).toHaveBeenCalledOnce()
		expect(destroy).toHaveBeenCalledOnce()
	}),
)

it.effect('cleans the page and destroys the loading task when operator extraction rejects', () =>
	Effect.gen(function* () {
		const cause = new Error('operators unavailable')
		const cleanup = vi.fn()
		const page = {
			view: [0, 0, 600, 800],
			getTextContent: vi.fn(() => Promise.resolve({ items: [] })),
			getOperatorList: vi.fn(() => Promise.reject(cause)),
			cleanup,
		}
		const document = { numPages: 1, getPage: vi.fn(() => Promise.resolve(page)) }
		const destroy = vi.fn(() => Promise.resolve())
		const load = vi.fn(() => ({ promise: Promise.resolve(document), destroy }))

		const error = yield* Effect.flip(
			Effect.gen(function* () {
				const pdf = yield* RulesPdf
				return yield* pdf.withDocument(
					{ path: '/rules/operators.pdf', data: new Uint8Array([5]) },
					(pdfDocument) => pdfDocument.extractTextAndOperatorsPage(1),
				)
			}).pipe(Effect.provide(layerTest(load))),
		)

		expect(error).toBeInstanceOf(RulesPdfError)
		expect(error).toMatchObject({ operation: 'extract-operators', page: 1, cause })
		expect(page.getTextContent).toHaveBeenCalledOnce()
		expect(page.getOperatorList).toHaveBeenCalledOnce()
		expect(cleanup).toHaveBeenCalledOnce()
		expect(destroy).toHaveBeenCalledOnce()
	}),
)

it.effect('releases resources after a downstream typed failure', () =>
	Effect.gen(function* () {
		const downstreamError = new Error('row reconstruction failed')
		const cleanup = vi.fn()
		const page = {
			view: [0, 0, 600, 800],
			getTextContent: vi.fn(() => Promise.resolve({ items: [] })),
			getOperatorList: vi.fn(() => Promise.resolve({ fnArray: [], argsArray: [] })),
			cleanup,
		}
		const document = { numPages: 1, getPage: vi.fn(() => Promise.resolve(page)) }
		const destroy = vi.fn(() => Promise.resolve())
		const load = vi.fn(() => ({ promise: Promise.resolve(document), destroy }))

		const error = yield* Effect.flip(
			Effect.gen(function* () {
				const pdf = yield* RulesPdf
				return yield* pdf.withDocument(
					{ path: '/rules/downstream.pdf', data: new Uint8Array([6]) },
					(pdfDocument) => pdfDocument.extractTextPage(1).pipe(Effect.andThen(Effect.fail(downstreamError))),
				)
			}).pipe(Effect.provide(layerTest(load))),
		)

		expect(error).toBe(downstreamError)
		expect(cleanup).toHaveBeenCalledOnce()
		expect(destroy).toHaveBeenCalledOnce()
	}),
)

it.effect('releases the page and loading task after a downstream defect', () =>
	Effect.gen(function* () {
		const defect = new Error('parser invariant failed')
		const cleanup = vi.fn()
		const page = {
			view: [0, 0, 600, 800],
			getTextContent: vi.fn(() => Promise.resolve({ items: [] })),
			getOperatorList: vi.fn(() => Promise.resolve({ fnArray: [], argsArray: [] })),
			cleanup,
		}
		const document = { numPages: 1, getPage: vi.fn(() => Promise.resolve(page)) }
		const destroy = vi.fn(() => Promise.resolve())
		const load = vi.fn(() => ({ promise: Promise.resolve(document), destroy }))

		const exit = yield* Effect.gen(function* () {
			const pdf = yield* RulesPdf
			return yield* pdf.withDocument(
				{ path: '/rules/defect.pdf', data: new Uint8Array([7]) },
				(pdfDocument) => pdfDocument.extractTextPage(1).pipe(Effect.andThen(Effect.die(defect))),
			)
		}).pipe(Effect.provide(layerTest(load)), Effect.exit)

		expect(Cause.hasDies(assertFailureExit(exit))).toBe(true)
		expect(Cause.squash(assertFailureExit(exit))).toBe(defect)
		expect(cleanup).toHaveBeenCalledOnce()
		expect(destroy).toHaveBeenCalledOnce()
	}),
)

it.effect('cleans the page and destroys the loading task when extraction is interrupted', () =>
	Effect.gen(function* () {
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
		const extraction = Effect.gen(function* () {
			const pdf = yield* RulesPdf
			return yield* pdf.withDocument(
				{ path: '/rules/interrupted.pdf', data: new Uint8Array([8]) },
				(pdfDocument) => pdfDocument.extractTextPage(1),
			)
		}).pipe(Effect.provide(layerTest(load)))
		const fiber = yield* Effect.forkChild(extraction, { startImmediately: true })
		yield* Effect.promise(() => extractionStarted.promise)

		yield* Fiber.interrupt(fiber)
		const exit = yield* Fiber.await(fiber)

		expect(Cause.hasInterruptsOnly(assertFailureExit(exit))).toBe(true)
		expect(cleanup).toHaveBeenCalledOnce()
		expect(destroy).toHaveBeenCalledOnce()
	}),
)

it.effect('reports page cleanup failure and still destroys the loading task', () =>
	Effect.gen(function* () {
		const cause = new Error('cleanup failed')
		const cleanup = vi.fn(() => {
			throw cause
		})
		const page = {
			view: [0, 0, 600, 800],
			getTextContent: vi.fn(() => Promise.resolve({ items: [] })),
			getOperatorList: vi.fn(() => Promise.resolve({ fnArray: [], argsArray: [] })),
			cleanup,
		}
		const document = { numPages: 1, getPage: vi.fn(() => Promise.resolve(page)) }
		const destroy = vi.fn(() => Promise.resolve())
		const load = vi.fn(() => ({ promise: Promise.resolve(document), destroy }))

		const error = yield* Effect.flip(
			Effect.gen(function* () {
				const pdf = yield* RulesPdf
				return yield* pdf.withDocument(
					{ path: '/rules/cleanup.pdf', data: new Uint8Array([9]) },
					(pdfDocument) => pdfDocument.extractTextPage(1),
				)
			}).pipe(Effect.provide(layerTest(load))),
		)

		expect(error).toBeInstanceOf(RulesPdfError)
		expect(error).toMatchObject({ operation: 'cleanup-page', page: 1, cause })
		expect(cleanup).toHaveBeenCalledOnce()
		expect(destroy).toHaveBeenCalledOnce()
	}),
)

it.effect('reports loading-task destruction failure after successful extraction', () =>
	Effect.gen(function* () {
		const cause = new Error('destroy failed')
		const cleanup = vi.fn()
		const page = {
			view: [0, 0, 600, 800],
			getTextContent: vi.fn(() => Promise.resolve({ items: [] })),
			getOperatorList: vi.fn(() => Promise.resolve({ fnArray: [], argsArray: [] })),
			cleanup,
		}
		const document = { numPages: 1, getPage: vi.fn(() => Promise.resolve(page)) }
		const destroy = vi.fn(() => Promise.reject(cause))
		const load = vi.fn(() => ({ promise: Promise.resolve(document), destroy }))

		const error = yield* Effect.flip(
			Effect.gen(function* () {
				const pdf = yield* RulesPdf
				return yield* pdf.withDocument(
					{ path: '/rules/destroy.pdf', data: new Uint8Array([10]) },
					(pdfDocument) => pdfDocument.extractTextPage(1),
				)
			}).pipe(Effect.provide(layerTest(load))),
		)

		expect(error).toBeInstanceOf(RulesPdfError)
		expect(error).toMatchObject({
			path: '/rules/destroy.pdf',
			operation: 'destroy-loading-task',
			cause,
		})
		expect(cleanup).toHaveBeenCalledOnce()
		expect(destroy).toHaveBeenCalledOnce()
	}),
)
