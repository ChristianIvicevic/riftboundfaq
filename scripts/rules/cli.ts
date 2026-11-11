import { Cause, Data, Result, Runtime } from 'effect'
import * as PlatformError from 'effect/PlatformError'

export const alreadyReportedRulesCliFailure = { [Runtime.errorReported]: false } as const

export type RulesCliFailure = Error | typeof alreadyReportedRulesCliFailure

export type RulesInspectionTarget = Readonly<{
	type: 'core' | 'tournament'
	path: string
}>

type RulesInspectionTargetFailure = Data.TaggedEnum<{
	RulesInspectionTargetError: {
		readonly operation: 'classify-source'
		readonly source: Readonly<{
			family: 'core-rules' | 'tournament-rules' | null
			version: string | null
			path: string
		}>
	}
}>

const makeInspectionTargetFailure = Data.taggedEnum<RulesInspectionTargetFailure>()

export type RulesInspectionTargetError = Error & RulesInspectionTargetFailure

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
		Object.assign(
			new Error(`Unsupported rules PDF filename: ${filename}`),
			makeInspectionTargetFailure.RulesInspectionTargetError({
				operation: 'classify-source',
				source: { family: null, version: null, path },
			}),
		),
	)
}

export function squashRulesCliCause(cause: Cause.Cause<unknown>): RulesCliFailure {
	const error = Cause.squash(cause)
	if (!Runtime.getErrorReported(error)) return alreadyReportedRulesCliFailure
	const outwardError = PlatformError.isPlatformError(error) ? (error.reason.cause ?? error) : error
	return outwardError instanceof Error ? outwardError : new Error(String(outwardError))
}
