import { join } from 'node:path'
import { createTournamentRulesFamilyAdapter } from './extract-internal'
import { readTournamentRulesSource } from './inspect'

const DEFAULT_SOURCES_DIRECTORY = join(import.meta.dirname, '..', '..', 'sources')

export const tournamentRulesFamilyAdapter = createTournamentRulesFamilyAdapter({
	readSource: readTournamentRulesSource,
	sourcesDirectory: DEFAULT_SOURCES_DIRECTORY,
	warn: console.warn,
})
