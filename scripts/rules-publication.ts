import type { CoreRulesFamily, RulesManifest, TournamentRulesFamily } from './rules-manifest.ts'

export type PreparedPublication<Summary = unknown> = {
	summary: Summary
}

export type RulesAdapter<Input, Prepared extends PreparedPublication> = {
	prepare: (input: Input) => Prepared | Promise<Prepared>
	publish: (prepared: Prepared) => unknown | Promise<unknown>
}

export type RulesDocumentFamilyPublicationAdapter<Input, Extracted, Prepared extends PreparedPublication> = {
	extract: (input: Input) => Extracted | Promise<Extracted>
	prepare: (extracted: Extracted) => Prepared | Promise<Prepared>
	publish: (prepared: Prepared) => unknown | Promise<unknown>
}

export type ReferenceRulesAdapter<
	ExtractedCoreRules,
	ExtractedTournamentRules,
	Reference extends PreparedPublication,
> = {
	prepare: (
		manifest: RulesManifest,
		inputs: { coreRules: ExtractedCoreRules; tournamentRules: ExtractedTournamentRules },
	) => Reference | Promise<Reference>
	publish: (prepared: Reference) => unknown | Promise<unknown>
}

export async function publishRules<
	Metadata extends PreparedPublication,
	ExtractedCoreRules,
	CoreRules extends PreparedPublication,
	ExtractedTournamentRules,
	TournamentRules extends PreparedPublication,
	Reference extends PreparedPublication,
>({
	manifest,
	metadataAdapter,
	coreRulesAdapter,
	tournamentRulesAdapter,
	referenceAdapter,
}: {
	manifest: RulesManifest
	metadataAdapter: RulesAdapter<RulesManifest, Metadata>
	coreRulesAdapter: RulesDocumentFamilyPublicationAdapter<CoreRulesFamily, ExtractedCoreRules, CoreRules>
	tournamentRulesAdapter: RulesDocumentFamilyPublicationAdapter<
		TournamentRulesFamily,
		ExtractedTournamentRules,
		TournamentRules
	>
	referenceAdapter: ReferenceRulesAdapter<ExtractedCoreRules, ExtractedTournamentRules, Reference>
}): Promise<{
	metadata: Metadata['summary']
	coreRules: CoreRules['summary']
	tournamentRules: TournamentRules['summary']
	reference: Reference['summary']
}> {
	const metadata = await metadataAdapter.prepare(manifest)
	const extractedCoreRules = await coreRulesAdapter.extract(manifest.coreRules)
	const coreRules = await coreRulesAdapter.prepare(extractedCoreRules)
	const extractedTournamentRules = await tournamentRulesAdapter.extract(manifest.tournamentRules)
	const tournamentRules = await tournamentRulesAdapter.prepare(extractedTournamentRules)
	const reference = await referenceAdapter.prepare(manifest, {
		coreRules: extractedCoreRules,
		tournamentRules: extractedTournamentRules,
	})

	await metadataAdapter.publish(metadata)
	await coreRulesAdapter.publish(coreRules)
	await tournamentRulesAdapter.publish(tournamentRules)
	await referenceAdapter.publish(reference)

	return {
		metadata: metadata.summary,
		coreRules: coreRules.summary,
		tournamentRules: tournamentRules.summary,
		reference: reference.summary,
	}
}
