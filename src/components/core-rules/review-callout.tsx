import { Callout } from 'fumadocs-ui/components/callout'
import { CURRENT_CORE_RULES_VERSION } from '@/generated/rules-metadata'

export function CoreRulesReviewCallout({ reviewedCoreRulesVersion }: { reviewedCoreRulesVersion: string }) {
	return (
		<Callout type={reviewedCoreRulesVersion === CURRENT_CORE_RULES_VERSION ? 'success' : 'error'}>
			{reviewedCoreRulesVersion === CURRENT_CORE_RULES_VERSION ? (
				<>
					<strong>Up-to-date:</strong> This page has been reviewed against the current core rules document
					(version {CURRENT_CORE_RULES_VERSION}).
				</>
			) : (
				<>
					<strong>Outdated:</strong> This page was written for version {reviewedCoreRulesVersion} of the core
					rules document and has not been reviewed against Core Rules {CURRENT_CORE_RULES_VERSION}. All links
					point to rules in the old version. The content, explanations, and described behaviours on this page
					are entirely based on that older version - the new version may have changed or removed rules covered
					here, rendering parts of this page inaccurate or obsolete. Treat this page with caution until it has
					been reviewed and updated.
				</>
			)}
		</Callout>
	)
}
