import { Callout } from 'fumadocs-ui/components/callout'

export function CoreRulesReviewCallout({
	reviewedVersion,
	currentVersion,
	reviewStatus,
}: {
	reviewedVersion: string
	currentVersion: string
	reviewStatus: 'up-to-date' | 'outdated'
}) {
	return (
		<Callout type={reviewStatus === 'up-to-date' ? 'success' : 'error'}>
			{reviewStatus === 'up-to-date' ? (
				<>
					<strong>Up-to-date:</strong> This page has been reviewed against the current core rules document
					(version {currentVersion}).
				</>
			) : (
				<>
					<strong>Outdated:</strong> This page was reviewed against Core Rules {reviewedVersion}, not the
					current version ({currentVersion}). Its citations still point to the reviewed version, and the
					ruling may no longer be accurate.
				</>
			)}
		</Callout>
	)
}
