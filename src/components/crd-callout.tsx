import { Callout } from 'fumadocs-ui/components/callout'
import { CURRENT_CRD_VERSION } from '@/lib/constants'

export function CrdCallout({ crdVersion }: { crdVersion: string }) {
	return (
		<div className="flex flex-col gap-0">
			<Callout type="info">
				<strong>Heads up:</strong> the core rules document is getting updated to version 1.4 on 16 July,
				bringing new content alongside changes to existing rules. Pages here may lag behind until they've been
				reviewed against the new version.
			</Callout>
			<Callout type={crdVersion === CURRENT_CRD_VERSION ? 'success' : 'error'}>
				{crdVersion === CURRENT_CRD_VERSION ? (
					<>
						<strong>Up-to-date:</strong> This page has been reviewed against the current core rules document
						(version {CURRENT_CRD_VERSION}).
					</>
				) : (
					<>
						<strong>Outdated:</strong> This page was written for version {crdVersion} of the core rules
						document and has not been reviewed against the current version ({CURRENT_CRD_VERSION}). All links
						point to rules in the old version. The content, explanations, and described behaviours on this
						page are entirely based on that older version - the new version may have changed or removed rules
						covered here, rendering parts of this page inaccurate or obsolete. Treat this page with caution
						until it has been reviewed and updated.
					</>
				)}
			</Callout>
		</div>
	)
}
