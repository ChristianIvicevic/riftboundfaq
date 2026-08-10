import { publishRules } from './rules-publication.ts'

const { coreRules, tournamentRules, reference } = await publishRules()

console.log(
	`Generated ${coreRules.versions} Core Rules versions, ${tournamentRules.versions} Tournament Rules versions, ${coreRules.transcripts + tournamentRules.transcripts} text transcripts, and ${reference.pages} reference pages.`,
)
