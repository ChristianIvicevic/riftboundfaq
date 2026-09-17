import {
	rulesDocuments,
	UnknownRulesVersionError,
	type CompiledRulesDocument,
} from '@/features/rules-documents/registry'

export type CoreRulesReview = Readonly<{
	reviewedVersion: string
	currentVersion: string
	reviewStatus: 'up-to-date' | 'outdated'
	document: CompiledRulesDocument
}>

export class CoreRulesReviewError extends Error {
	constructor(
		readonly url: string,
		readonly reviewedVersion: string,
		cause: UnknownRulesVersionError,
	) {
		super(
			`Core Rules review for page ${JSON.stringify(url)} identifies unknown version ${JSON.stringify(reviewedVersion)}`,
			{ cause },
		)
	}
}

export function resolveCoreRulesReview({
	url,
	reviewedVersion,
}: Readonly<{
	url: string
	reviewedVersion?: string
}>): CoreRulesReview | undefined {
	if (!reviewedVersion) return

	const coreRules = rulesDocuments.family('core-rules')
	let document: CompiledRulesDocument
	try {
		document = coreRules.get(reviewedVersion)
	} catch (cause) {
		if (cause instanceof UnknownRulesVersionError) throw new CoreRulesReviewError(url, reviewedVersion, cause)
		throw cause
	}
	return Object.freeze({
		reviewedVersion: document.identity.version,
		currentVersion: coreRules.currentVersion.version,
		reviewStatus: document.identity.version === coreRules.currentVersion.version ? 'up-to-date' : 'outdated',
		document,
	})
}
