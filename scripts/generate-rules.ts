import * as NodeRuntime from '@effect/platform-node/NodeRuntime'
import * as NodeServices from '@effect/platform-node/NodeServices'
import { Cause, Console, Effect, Logger } from 'effect'
import { squashRulesCliCause } from './rules/cli'
import { generateRules } from './rules/generate'
import { LIVE_LAYER as RULES_PDF_LIVE_LAYER } from './rules/pdf'

const program = Effect.gen(function* () {
	const { coreRules, tournamentRules, reference } = yield* generateRules()

	yield* Console.log(
		`Generated ${coreRules.versions} Core Rules versions, ${tournamentRules.versions} Tournament Rules versions, ${coreRules.transcripts + tournamentRules.transcripts} text transcripts, and ${reference.pages} reference pages.`,
	)
}).pipe(
	Effect.tapCause((cause) =>
		Cause.hasInterruptsOnly(cause) ? Effect.void : Console.error(squashRulesCliCause(cause)),
	),
	Effect.provide(NodeServices.layer),
	Effect.provide(RULES_PDF_LIVE_LAYER),
	Effect.provide(Logger.layer([])),
)

NodeRuntime.runMain(program, { disableErrorReporting: true })
