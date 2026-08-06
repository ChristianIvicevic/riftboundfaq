export type PreparedPublication<Summary = unknown> = {
	summary: Summary
}

export type RulesAdapter<Prepared extends PreparedPublication> = {
	prepare: (manifest: unknown) => Prepared | Promise<Prepared>
	publish: (prepared: Prepared) => unknown | Promise<unknown>
}

export type ReferenceRulesAdapter<
	CoreRules extends PreparedPublication,
	TournamentRules extends PreparedPublication,
	Reference extends PreparedPublication,
> = {
	prepare: (
		manifest: unknown,
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
	manifest: unknown
	metadataAdapter: RulesAdapter<Metadata>
	coreRulesAdapter: RulesAdapter<CoreRules>
	tournamentRulesAdapter: RulesAdapter<TournamentRules>
	referenceAdapter: ReferenceRulesAdapter<CoreRules, TournamentRules, Reference>
}): Promise<{
	metadata: Metadata['summary']
	coreRules: CoreRules['summary']
	tournamentRules: TournamentRules['summary']
	reference: Reference['summary']
}> {
	const metadata = await metadataAdapter.prepare(manifest)
	const coreRules = await coreRulesAdapter.prepare(manifest)
	const tournamentRules = await tournamentRulesAdapter.prepare(manifest)
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
