import { Callout } from 'fumadocs-ui/components/callout'
import { CURRENT_CRD_VERSION } from '@/lib/constants'

export function CrdCallout({ crdVersion }: { crdVersion: string }) {
	return (
		<Callout type={crdVersion === CURRENT_CRD_VERSION ? 'success' : 'warn'}>
			{crdVersion === CURRENT_CRD_VERSION ? (
				<>
					<strong>Up-to-date:</strong> This page references the current core rules document version (
					{CURRENT_CRD_VERSION}).
				</>
			) : (
				<>
					<strong>Outdated:</strong> This page references an older version ({crdVersion}) of the core rules
					document. All links point to the corresponding rules in that version. The current version is{' '}
					{CURRENT_CRD_VERSION}.
				</>
			)}
		</Callout>
	)
}
