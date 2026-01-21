'use client'

import { use } from 'react'
import { CrdVersionContext } from '@/components/crd-version'

export function Rule({ number }: { number: string }) {
	const { crdVersion } = use(CrdVersionContext)
	const urlFormattedVersion = crdVersion?.replaceAll('.', '-')

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
