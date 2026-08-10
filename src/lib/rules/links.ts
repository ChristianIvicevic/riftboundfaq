import { coreRulesConventions, tournamentRulesConventions } from '@/lib/rules/document-family-conventions'

function documentRoute(
	family: typeof coreRulesConventions | typeof tournamentRulesConventions,
	version: string,
) {
	if (family.isVersion(version)) return family.version(version).reference.documentRoute
	return `/reference/${family.id}/${version}`
}

export const coreRulesLinks = {
	document: (version: string) => documentRoute(coreRulesConventions, version),
	rule: ({ number, version }: { number: string; version: string }) =>
		`${documentRoute(coreRulesConventions, version)}#R${number}`,
}

export const tournamentRulesLinks = {
	document: (version: string) => documentRoute(tournamentRulesConventions, version),
	rule: ({ anchor, version }: { anchor: string; version: string }) =>
		`${documentRoute(tournamentRulesConventions, version)}#${anchor}`,
}
