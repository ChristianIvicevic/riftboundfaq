import { Context, Data, Effect, Layer } from 'effect'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

export type RulesPdfOperation =
	| 'create-loading-task'
	| 'initialize-document'
	| 'acquire-page'
	| 'extract-text'
	| 'extract-operators'
	| 'cleanup-page'
	| 'destroy-loading-task'

export class RulesPdfError extends Data.TaggedError('RulesPdfError')<{
	readonly path: string
	readonly operation: RulesPdfOperation
	readonly page?: number
	readonly message: string
	readonly cause: unknown
}> {}

export type PdfTextPage = Readonly<{
	page: number
	width: number
	items: readonly unknown[]
}>

export type PdfOperatorList = Readonly<{
	fnArray: readonly number[]
	argsArray: readonly unknown[][]
}>

export type PdfTextAndOperatorPage = PdfTextPage &
	Readonly<{
		operators: PdfOperatorList
	}>

export type RulesPdfDocument = Readonly<{
	pageCount: number
	extractTextPage: (page: number) => Effect.Effect<PdfTextPage, RulesPdfError>
	extractTextAndOperatorsPage: (page: number) => Effect.Effect<PdfTextAndOperatorPage, RulesPdfError>
}>

export type RulesPdfSource = Readonly<{
	path: string
	data: Uint8Array
}>

type RulesPdfService = Readonly<{
	withDocument: <A, E, R>(
		source: RulesPdfSource,
		use: (document: RulesPdfDocument) => Effect.Effect<A, E, R>,
	) => Effect.Effect<A, E | RulesPdfError, R>
}>

export const RulesPdf = Context.Service<RulesPdfService>('riftboundfaq/RulesPdf')

export type PdfJsPage = Readonly<{
	view: readonly number[]
	getTextContent: () => PromiseLike<Readonly<{ items: readonly unknown[] }>>
	getOperatorList: () => PromiseLike<
		Readonly<{ fnArray: readonly number[]; argsArray: readonly unknown[][] }>
	>
	cleanup: () => boolean | void
}>

export type PdfJsDocument = Readonly<{
	numPages: number
	getPage: (page: number) => PromiseLike<PdfJsPage>
}>

export type PdfJsLoadingTask = Readonly<{
	promise: PromiseLike<PdfJsDocument>
	destroy: () => PromiseLike<void>
}>

export type PdfJsLoader = (data: Uint8Array) => PdfJsLoadingTask

function causeMessage(cause: unknown): string {
	try {
		return cause instanceof Error ? cause.message : String(cause)
	} catch {
		return 'Unknown PDF.js failure'
	}
}

function pdfError(path: string, operation: RulesPdfOperation, cause: unknown, page?: number): RulesPdfError {
	const location = page === undefined ? path : `${path} page ${page}`
	return new RulesPdfError({
		path,
		operation,
		page,
		message: `${location}: ${operation} failed: ${causeMessage(cause)}`,
		cause,
	})
}

function withPage<A, E, R>(
	path: string,
	document: PdfJsDocument,
	pageNumber: number,
	use: (page: PdfJsPage) => Effect.Effect<A, E, R>,
): Effect.Effect<A, E | RulesPdfError, R> {
	return Effect.acquireUseRelease(
		Effect.tryPromise({
			try: () => document.getPage(pageNumber),
			catch: (cause) => pdfError(path, 'acquire-page', cause, pageNumber),
		}),
		use,
		(page) =>
			Effect.try({
				try: () => {
					page.cleanup()
				},
				catch: (cause) => pdfError(path, 'cleanup-page', cause, pageNumber),
			}),
	)
}

function extractText(path: string, page: PdfJsPage, pageNumber: number) {
	return Effect.tryPromise({
		try: () => page.getTextContent(),
		catch: (cause) => pdfError(path, 'extract-text', cause, pageNumber),
	})
}

function extractOperators(path: string, page: PdfJsPage, pageNumber: number) {
	return Effect.tryPromise({
		try: () => page.getOperatorList(),
		catch: (cause) => pdfError(path, 'extract-operators', cause, pageNumber),
	})
}

function extractTextPage(path: string, document: PdfJsDocument, pageNumber: number) {
	return withPage(path, document, pageNumber, (page) =>
		extractText(path, page, pageNumber).pipe(
			Effect.map((textContent) => ({
				page: pageNumber,
				width: page.view[2],
				items: textContent.items,
			})),
		),
	)
}

function extractTextAndOperatorsPage(path: string, document: PdfJsDocument, pageNumber: number) {
	return withPage(path, document, pageNumber, (page) =>
		Effect.zip(extractText(path, page, pageNumber), extractOperators(path, page, pageNumber), {
			concurrent: true,
		}).pipe(
			Effect.map(([textContent, operators]) => ({
				page: pageNumber,
				width: page.view[2],
				items: textContent.items,
				operators: { fnArray: operators.fnArray, argsArray: operators.argsArray },
			})),
		),
	)
}

function makeRulesPdf(load: PdfJsLoader): RulesPdfService {
	return {
		withDocument: (source, use) =>
			Effect.acquireUseRelease(
				Effect.try({
					try: () => load(source.data),
					catch: (cause) => pdfError(source.path, 'create-loading-task', cause),
				}),
				(loadingTask) =>
					Effect.tryPromise({
						try: () => loadingTask.promise,
						catch: (cause) => pdfError(source.path, 'initialize-document', cause),
					}).pipe(
						Effect.flatMap((document) =>
							Effect.suspend(() =>
								use({
									pageCount: document.numPages,
									extractTextPage: (page) => extractTextPage(source.path, document, page),
									extractTextAndOperatorsPage: (page) =>
										extractTextAndOperatorsPage(source.path, document, page),
								}),
							),
						),
					),
				(loadingTask) =>
					Effect.tryPromise({
						try: () => loadingTask.destroy(),
						catch: (cause) => pdfError(source.path, 'destroy-loading-task', cause),
					}),
			),
	}
}

export const LIVE_LAYER = Layer.succeed(
	RulesPdf,
	makeRulesPdf((data) => getDocument({ data })),
)

export function testLayer(load: PdfJsLoader) {
	return Layer.succeed(RulesPdf, makeRulesPdf(load))
}
