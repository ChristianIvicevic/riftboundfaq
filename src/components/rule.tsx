'use client'

import { use } from 'react'
import { CrdVersionContext } from '@/components/crd-version'

export function Rule({ number }: { number: string }) {
	const { crdVersion } = use(CrdVersionContext)

	if (!crdVersion) {
		return <span>CR {number}</span>
	}

	const urlFormattedVersion = crdVersion.replaceAll('.', '-')

	return (
		<a
			href={`https://jeff425.github.io/hyperlinked-rb-cr/ver${urlFormattedVersion}.html#rule_${number}`}
			rel="noopener noreferrer"
			target="_blank"
		>
			CR {number}
		</a>
	)
}
