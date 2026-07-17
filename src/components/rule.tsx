'use client'

import { use } from 'react'
import { CrdVersionContext } from '@/components/crd-version'

export function Rule({ number }: { number: string }) {
	const { crdVersion } = use(CrdVersionContext)

	if (!crdVersion) {
		return <sup className="text-nowrap text-fd-muted-foreground">[{number}]</sup>
	}

	return (
		<sup>
			<a
				href={`/core-rules#${number}`}
				rel="noopener noreferrer"
				target="_blank"
				className="text-nowrap no-underline"
			>
				[{number}]
			</a>
		</sup>
	)
}
