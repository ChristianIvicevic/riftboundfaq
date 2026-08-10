import type { CoreRulesFamily, RulesManifest, TournamentRulesFamily } from './rules-manifest.ts'

export type PreparedPublication<Summary = unknown> = {
	summary: Summary
}

export type RulesAdapter<Input, Prepared extends PreparedPublication> = {
	prepare: (input: Input) => Prepared | Promise<Prepared>
	publish: (prepared: Prepared) => unknown | Promise<unknown>
}

export type ReferenceRulesAdapter<
	CoreRules extends PreparedPublication,
	TournamentRules extends PreparedPublication,
	Reference extends PreparedPublication,
> = {
	prepare: (
		manifest: RulesManifest,
		inputs: { coreRules: CoreRules; tournamentRules: TournamentRules },
	) => Reference | Promise<Reference>
	publish: (prepared: Reference) => unknown | Promise<unknown>
}

export async function publishRules<
	Metadata extends PreparedPublication,
	CoreRules extends PreparedPublication,
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
	coreRulesAdapter: RulesAdapter<CoreRulesFamily, CoreRules>
	tournamentRulesAdapter: RulesAdapter<TournamentRulesFamily, TournamentRules>
	referenceAdapter: ReferenceRulesAdapter<CoreRules, TournamentRules, Reference>
}): Promise<{
	metadata: Metadata['summary']
	coreRules: CoreRules['summary']
	tournamentRules: TournamentRules['summary']
	reference: Reference['summary']
}> {
	const metadata = await metadataAdapter.prepare(manifest)
	const coreRules = await coreRulesAdapter.prepare(manifest.coreRules)
	const tournamentRules = await tournamentRulesAdapter.prepare(manifest.tournamentRules)
	const reference = await referenceAdapter.prepare(manifest, { coreRules, tournamentRules })

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
