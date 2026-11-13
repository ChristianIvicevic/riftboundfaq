import { Cause, Data, Result, Runtime } from 'effect'
import * as PlatformError from 'effect/PlatformError'

const AlreadyReportedRulesCliError = Data.TaggedError('AlreadyReportedRulesCliError')<{
	readonly [Runtime.errorReported]: false
}>

export const alreadyReportedRulesCliFailure = new AlreadyReportedRulesCliError({
	[Runtime.errorReported]: false,
})

export type RulesCliFailure = Error

export type RulesInspectionTarget = Readonly<{
	type: 'core' | 'tournament'
	path: string
}>

export class RulesInspectionTargetError extends Data.TaggedError('RulesInspectionTargetError')<{
	readonly operation: 'classify-source'
	readonly source: Readonly<{
		family: 'core-rules' | 'tournament-rules' | null
		version: string | null
		path: string
	}>
	readonly message: string
}> {}

export function classifyRulesInspectionTarget({
	filename,
	path,
}: Readonly<{ filename: string; path: string }>): Result.Result<
	RulesInspectionTarget,
	RulesInspectionTargetError
> {
	if (/^CR-v.+\.pdf$/u.test(filename)) return Result.succeed({ type: 'core', path })
	if (/^Tournament-Rules-.+\.pdf$/u.test(filename)) {
		return Result.succeed({ type: 'tournament', path })
	}
	return Result.fail(
		new RulesInspectionTargetError({
			operation: 'classify-source',
			source: { family: null, version: null, path },
			message: `Unsupported rules PDF filename: ${filename}`,
		}),
	)
}

export function squashRulesCliCause(cause: Cause.Cause<unknown>): RulesCliFailure {
	const error = Cause.squash(cause)
	if (!Runtime.getErrorReported(error)) return alreadyReportedRulesCliFailure
	const outwardError = PlatformError.isPlatformError(error) ? (error.reason.cause ?? error) : error
	return outwardError instanceof Error ? outwardError : new Error(String(outwardError))
}
