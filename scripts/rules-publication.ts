import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createCoreRulesFamilyAdapter } from './core-rules/extract-internal'
import { prepareCoreRulesArtifacts } from './core-rules/generate'
import { inspectPdf } from './core-rules/inspect'
import { prepareReferencePublication } from './reference/publication'
import { parseRulesManifest } from './rules-manifest'
import { prepareRulesMetadata } from './rules-metadata'
import {
	createRulesPublisher,
	type PreparedRulesPublication,
	type RulesPublicationOptions,
	type RulesPublicationSummary,
} from './rules-publication-internal'
import { createTournamentRulesFamilyAdapter } from './tournament-rules/extract-internal'
import { prepareTournamentRulesArtifacts } from './tournament-rules/generate'
import { readTournamentRulesSource } from './tournament-rules/inspect'

export { RulesPublicationError } from './rules-publication-internal'
export type {
	RulesPublicationOptions,
	RulesPublicationState,
	RulesPublicationSummary,
} from './rules-publication-internal'

const DEFAULT_PROJECT_DIRECTORY = join(import.meta.dirname, '..')

async function prepareRulesPublication(projectDirectory: string): Promise<PreparedRulesPublication> {
	const sourcesDirectory = join(projectDirectory, 'sources')
	const manifestPath = join(sourcesDirectory, 'rules-manifest.json')
	const manifest = parseRulesManifest(JSON.parse(await readFile(manifestPath, 'utf8')))
	const metadata = prepareRulesMetadata(manifest)
	const coreRulesAdapter = createCoreRulesFamilyAdapter({ inspectSource: inspectPdf, sourcesDirectory })
	const tournamentRulesAdapter = createTournamentRulesFamilyAdapter({
		readSource: readTournamentRulesSource,
		sourcesDirectory,
		warn: console.warn,
	})
	const extractedCoreRules = await coreRulesAdapter.extract(manifest.coreRules)
	const coreRules = prepareCoreRulesArtifacts(extractedCoreRules)
	const extractedTournamentRules = await tournamentRulesAdapter.extract(manifest.tournamentRules)
	const tournamentRules = prepareTournamentRulesArtifacts(extractedTournamentRules)
	const reference = await prepareReferencePublication({
		projectDirectory,
		coreRules: extractedCoreRules,
		tournamentRules: extractedTournamentRules,
	})

	return {
		metadata: metadata.contents,
		coreRules: {
			artifacts: coreRules.artifacts,
			registeredVersions: manifest.coreRules.registeredVersions.map(({ version }) => version),
			transcripts: coreRules.transcripts,
		},
		tournamentRules: {
			artifacts: tournamentRules.artifacts,
			registeredVersions: manifest.tournamentRules.registeredVersions.map(({ version }) => version),
			transcripts: tournamentRules.transcripts,
		},
		reference: reference.artifacts,
		summary: {
			coreRules: coreRules.summary,
			tournamentRules: tournamentRules.summary,
			reference: reference.summary,
		},
	}
}

const rulesPublisher = createRulesPublisher({
	defaultProjectDirectory: DEFAULT_PROJECT_DIRECTORY,
	prepare: prepareRulesPublication,
})

/**
 * Publishes one complete generated result. Callers must await the single writer
 * before starting readers that consume generated rules files.
 */
export function publishRules(options?: RulesPublicationOptions): Promise<RulesPublicationSummary> {
	return rulesPublisher(options)
}
