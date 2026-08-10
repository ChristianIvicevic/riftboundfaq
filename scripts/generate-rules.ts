import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { prepareCoreRulesArtifacts, publishCoreRules } from './core-rules/generate.ts'
import { prepareReferencePages, publishReferencePages } from './reference/generate.ts'
import { coreRulesFamilyAdapter, tournamentRulesFamilyAdapter } from './rules-document-family.ts'
import { parseRulesManifest } from './rules-manifest.ts'
import { prepareRulesMetadata, publishRulesMetadata } from './rules-metadata.ts'
import { publishRules } from './rules-publication.ts'
import { prepareTournamentRulesArtifacts, publishTournamentRules } from './tournament-rules/generate.ts'

const manifestPath = join(import.meta.dirname, '..', 'sources', 'rules-manifest.json')
const manifest = parseRulesManifest(JSON.parse(await readFile(manifestPath, 'utf8')))
const { coreRules, tournamentRules, reference } = await publishRules({
	manifest,
	metadataAdapter: { prepare: prepareRulesMetadata, publish: publishRulesMetadata },
	coreRulesAdapter: {
		extract: coreRulesFamilyAdapter.extract,
		prepare: prepareCoreRulesArtifacts,
		publish: publishCoreRules,
	},
	tournamentRulesAdapter: {
		extract: tournamentRulesFamilyAdapter.extract,
		prepare: prepareTournamentRulesArtifacts,
		publish: publishTournamentRules,
	},
	referenceAdapter: {
		prepare: (rulesManifest, { coreRules: extractedCoreRules, tournamentRules: extractedTournamentRules }) =>
			prepareReferencePages(rulesManifest, {
				coreRules: extractedCoreRules.versions,
				tournamentRules: extractedTournamentRules.versions,
			}),
		publish: publishReferencePages,
	},
})

console.log(
	`Generated ${coreRules.versions} Core Rules versions, ${tournamentRules.versions} Tournament Rules versions, ${coreRules.transcripts + tournamentRules.transcripts} text transcripts, and ${reference.pages} reference pages.`,
)
