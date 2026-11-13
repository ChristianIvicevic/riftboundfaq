import { Console, Data, Effect, Result } from 'effect'
import * as FileSystem from 'effect/FileSystem'
import * as Path from 'effect/Path'
import * as PlatformError from 'effect/PlatformError'
import {
	extractCoreRulesVersion,
	type CoreRulesExtractionError,
	type ExtractedCoreRulesFamily,
} from './core/extract'
import { parseRulesManifest, type RulesManifestError } from './manifest'
import {
	generateRulesOutput,
	loadRulesOutputTemplates,
	RulesOutputError,
	type RulesOutputStage,
} from './output'
import { RulesPdfError } from './pdf'
import {
	extractTournamentRulesVersion,
	type ExtractedTournamentRulesFamily,
	type TournamentRulesExtractionError,
} from './tournament/extract'

export type { RulesGenerationSummary } from './output'

export type RulesGenerationOptions = Readonly<{
	projectDirectory?: string
}>

export type RulesGenerationStage =
	| 'configuration'
	| 'manifest'
	| 'core-rules'
	| 'tournament-rules'
	| RulesOutputStage

export type RulesGenerationContext =
	| Readonly<{ kind: 'project'; path: string }>
	| Readonly<{
			kind: 'input'
			path: string
			family?: 'core-rules' | 'tournament-rules'
			version?: string
			page?: number
	  }>
	| Readonly<{ kind: 'output'; path: string }>

export class RulesGenerationError extends Data.TaggedError('RulesGenerationError')<{
	readonly stage: RulesGenerationStage
	readonly context?: RulesGenerationContext
	readonly message: string
	readonly cause: unknown
}> {}

function causeMessage(cause: unknown): string {
	const outward = PlatformError.isPlatformError(cause) ? (cause.reason.cause ?? cause) : cause
	return outward instanceof Error ? outward.message : String(outward)
}

function causedGenerationError(
	stage: RulesGenerationStage,
	message: string,
	cause: unknown,
	context?: RulesGenerationContext,
): RulesGenerationError {
	return new RulesGenerationError({ stage, context, message: `${message}: ${causeMessage(cause)}`, cause })
}

function extractionContext(
	error: CoreRulesExtractionError | TournamentRulesExtractionError,
): RulesGenerationContext {
	const nestedPage = error.cause instanceof RulesPdfError ? error.cause.page : undefined
	return {
		kind: 'input',
		...error.source,
		page: 'page' in error ? (error.page ?? nestedPage) : nestedPage,
	}
}

function outputGenerationError(error: RulesOutputError): RulesGenerationError {
	return new RulesGenerationError({
		stage: error.stage,
		context: error.context,
		message: error.message,
		cause: error.cause,
	})
}

/**
 * Prepares and validates the complete generated result before directly
 * reconciling every rules output path owned by this generator.
 */
export const generateRules = Effect.fn('generateRules')(function* (options: RulesGenerationOptions = {}) {
	const fileSystem = yield* FileSystem.FileSystem
	const pathService = yield* Path.Path
	const projectDirectory = options.projectDirectory ?? pathService.join(import.meta.dirname, '..', '..')
	if (!projectDirectory || !pathService.isAbsolute(projectDirectory)) {
		return yield* new RulesGenerationError({
			stage: 'configuration',
			context: { kind: 'project', path: projectDirectory },
			message: 'Rules generation requires an absolute project directory',
			cause: undefined,
		})
	}

	const sourcesDirectory = pathService.join(projectDirectory, 'sources')
	const manifestPath = pathService.join(sourcesDirectory, 'rules-manifest.json')
	const manifestContents = yield* fileSystem.readFileString(manifestPath).pipe(
		Effect.mapError((cause) =>
			causedGenerationError('manifest', `Rules manifest could not be read from ${manifestPath}`, cause, {
				kind: 'input',
				path: manifestPath,
			}),
		),
	)
	const manifestSource = yield* Effect.fromResult(
		Result.try({
			try: () => JSON.parse(manifestContents),
			catch: (cause) =>
				causedGenerationError('manifest', `Rules manifest could not be parsed at ${manifestPath}`, cause, {
					kind: 'input',
					path: manifestPath,
				}),
		}),
	)
	const manifest = yield* Effect.fromResult(
		parseRulesManifest(manifestSource).pipe(
			Result.mapError((cause: RulesManifestError) =>
				causedGenerationError('manifest', `Rules manifest is invalid at ${manifestPath}`, cause, {
					kind: 'input',
					path: manifestPath,
				}),
			),
		),
	)

	const templatesDirectory = pathService.join(projectDirectory, 'scripts', 'rules', 'templates')
	const templates = yield* loadRulesOutputTemplates(templatesDirectory).pipe(
		Effect.mapError(outputGenerationError),
	)

	// Families and their large PDFs stay sequential to cap memory usage and stop at the first failure.
	const extractedCoreRulesVersions = yield* Effect.forEach(
		manifest.coreRules.registeredVersions,
		(registeredVersion) =>
			Effect.gen(function* () {
				const extracted = yield* extractCoreRulesVersion(registeredVersion, sourcesDirectory)
				for (const { message } of extracted.diagnostics) yield* Console.warn(message)
				return extracted
			}),
	).pipe(
		Effect.mapError((cause) =>
			causedGenerationError('core-rules', 'Core Rules generation failed', cause, extractionContext(cause)),
		),
	)
	const extractedCoreRules = {
		versions: extractedCoreRulesVersions,
		currentVersion: extractedCoreRulesVersions.find(
			({ registeredVersion }) => registeredVersion === manifest.coreRules.currentVersion,
		)!,
	} satisfies ExtractedCoreRulesFamily

	const extractedTournamentRulesVersions = yield* Effect.forEach(
		manifest.tournamentRules.registeredVersions,
		(registeredVersion) =>
			Effect.gen(function* () {
				const extracted = yield* extractTournamentRulesVersion(registeredVersion, sourcesDirectory)
				for (const { message } of extracted.diagnostics) yield* Console.warn(message)
				return extracted
			}),
	).pipe(
		Effect.mapError((cause) =>
			causedGenerationError(
				'tournament-rules',
				'Tournament Rules generation failed',
				cause,
				extractionContext(cause),
			),
		),
	)
	const extractedTournamentRules = {
		versions: extractedTournamentRulesVersions,
		currentVersion: extractedTournamentRulesVersions.find(
			({ registeredVersion }) => registeredVersion === manifest.tournamentRules.currentVersion,
		)!,
	} satisfies ExtractedTournamentRulesFamily

	return yield* generateRulesOutput(
		projectDirectory,
		extractedCoreRules,
		extractedTournamentRules,
		templates,
	).pipe(Effect.mapError(outputGenerationError))
})
