'use client'

import { use } from 'react'
import { CrdVersionContext } from '@/components/core-rules/version'
import { RULES_BY_ID } from '@/generated/rules/core-rules'
import { ruleHref } from '@/lib/constants'

export function Rule({ number }: { number: string }) {
	const { crdVersion } = use(CrdVersionContext)

	if (!crdVersion) {
		return <sup className="text-nowrap text-fd-muted-foreground">[{number}]</sup>
	}

	const rulesText = RULES_BY_ID[crdVersion]?.get(number)?.join(' ')

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
