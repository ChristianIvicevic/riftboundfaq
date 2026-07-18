'use client'

import { use } from 'react'
import { CRD_VERSIONS } from '@/components/core-rules/data'
import { CrdVersionContext } from '@/components/core-rules/version'
import { ruleHref } from '@/lib/constants'

export function Rule({ number }: { number: string }) {
	const { crdVersion } = use(CrdVersionContext)

	if (!crdVersion) {
		return <sup className="text-nowrap text-fd-muted-foreground">[{number}]</sup>
	}

	const rulesText = CRD_VERSIONS[crdVersion]?.rules.find((it) => it.id === number)?.lines.join(' ')

	return (
		<sup>
			<a
				href={ruleHref(number, crdVersion)}
				rel="noopener noreferrer"
				target="_blank"
				className="text-nowrap no-underline"
				title={rulesText}
			>
				[{number}]
			</a>
		</sup>
	)
}
