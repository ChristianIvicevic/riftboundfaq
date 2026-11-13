import * as NodeRuntime from '@effect/platform-node/NodeRuntime'
import * as NodeServices from '@effect/platform-node/NodeServices'
import { Cause, Console, Effect, Logger, Runtime } from 'effect'
import { squashRulesCliCause } from './rules/cli'
import { generateRules } from './rules/generate'
import { layer as rulesPdfLayer } from './rules/pdf'

const program = Effect.gen(function* () {
	const { coreRules, tournamentRules, reference } = yield* generateRules()

	yield* Console.log(
		`Generated ${coreRules.versions} Core Rules versions, ${tournamentRules.versions} Tournament Rules versions, ${coreRules.transcripts + tournamentRules.transcripts} text transcripts, and ${reference.pages} reference pages.`,
	)
}).pipe(
	Effect.tapCause((cause) => {
		if (Cause.hasInterruptsOnly(cause)) return Effect.void
		const error = squashRulesCliCause(cause)
		return Runtime.getErrorReported(error) ? Console.error(error) : Effect.void
	}),
	Effect.provide(NodeServices.layer),
	Effect.provide(rulesPdfLayer),
	Effect.provide(Logger.layer([])),
)

NodeRuntime.runMain(program, { disableErrorReporting: true })
