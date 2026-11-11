import * as NodeRuntime from '@effect/platform-node/NodeRuntime'
import * as NodeServices from '@effect/platform-node/NodeServices'
import { Cause, Console, Effect, Logger, Runtime } from 'effect'
import { squashRulesCliCause } from './rules/cli'
import { inspectRules } from './rules/inspect'
import { LIVE_LAYER as RULES_PDF_LIVE_LAYER } from './rules/pdf'

const program = inspectRules(process.argv.slice(2)).pipe(
	Effect.tapCause((cause) => {
		if (Cause.hasInterruptsOnly(cause)) return Effect.void
		const error = squashRulesCliCause(cause)
		return Runtime.getErrorReported(error) ? Console.error(error) : Effect.void
	}),
	Effect.provide(NodeServices.layer),
	Effect.provide(RULES_PDF_LIVE_LAYER),
	Effect.provide(Logger.layer([])),
)

NodeRuntime.runMain(program, { disableErrorReporting: true })
