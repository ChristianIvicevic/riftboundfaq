import {
	rulesDocuments,
	UnknownRulesVersionError,
	type TraversedRulesDocument,
} from '@/features/rules-documents/registry'

export type CoreRulesReview = Readonly<{
	reviewedVersion: string
	currentVersion: string
	status: 'current' | 'archived'
	document: TraversedRulesDocument
}>

export class CoreRulesReviewError extends Error {
	constructor(
		readonly url: string,
		readonly reviewedVersion: string,
		cause: UnknownRulesVersionError,
	) {
		super(
			`Core Rules review for Page publication ${JSON.stringify(url)} identifies unknown version ${JSON.stringify(reviewedVersion)}`,
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
	let document: TraversedRulesDocument
	try {
		document = coreRules.get(reviewedVersion)
	} catch (cause) {
		if (cause instanceof UnknownRulesVersionError) throw new CoreRulesReviewError(url, reviewedVersion, cause)
		throw cause
	}
	return Object.freeze({
		reviewedVersion: document.identity.version,
		currentVersion: coreRules.currentVersion.version,
		status: document.identity.status,
		document,
	})
}
