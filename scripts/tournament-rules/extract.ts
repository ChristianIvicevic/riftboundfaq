import { join } from 'node:path'
import { createTournamentRulesFamilyAdapter } from './extract-internal.ts'
import { inspectTournamentPdf } from './inspect.ts'

const DEFAULT_SOURCES_DIRECTORY = join(import.meta.dirname, '..', '..', 'sources')

export const tournamentRulesFamilyAdapter = createTournamentRulesFamilyAdapter({
	inspectSource: inspectTournamentPdf,
	sourcesDirectory: DEFAULT_SOURCES_DIRECTORY,
	warn: console.warn,
})
