import { Callout } from 'fumadocs-ui/components/callout'

export function OutdatedCoreRulesReviewCallout({
	reviewedVersion,
	currentVersion,
}: {
	reviewedVersion: string
	currentVersion: string
}) {
	return (
		<Callout type="error">
			<strong>Outdated:</strong> This page was reviewed against Core Rules {reviewedVersion}, not the current
			version ({currentVersion}). Its citations still point to the reviewed version, and the ruling may no
			longer be accurate.
		</Callout>
	)
}
