import { Callout } from 'fumadocs-ui/components/callout'

export function CoreRulesReviewCallout({
	reviewedVersion,
	currentVersion,
	status,
}: {
	reviewedVersion: string
	currentVersion: string
	status: 'current' | 'archived'
}) {
	return (
		<Callout type={status === 'current' ? 'success' : 'error'}>
			{status === 'current' ? (
				<>
					<strong>Up-to-date:</strong> This page has been reviewed against the current core rules document
					(version {currentVersion}).
				</>
			) : (
				<>
					<strong>Outdated:</strong> This page was written for version {reviewedVersion} of the core rules
					document and has not been reviewed against Core Rules {currentVersion}. All links point to rules in
					the old version. The content, explanations, and described behaviours on this page are entirely based
					on that older version - the new version may have changed or removed rules covered here, rendering
					parts of this page inaccurate or obsolete. Treat this page with caution until it has been reviewed
					and updated.
				</>
			)}
		</Callout>
	)
}
