'use client'

import { DocsBody } from 'fumadocs-ui/layouts/spacious/page'
import type { ComponentProps } from 'react'
import { handleCopy } from '@/components/copyable-content'

export function CopyableDocsBody({ children, ...props }: ComponentProps<typeof DocsBody>) {
	return (
		<DocsBody {...props} onCopy={handleCopy}>
			{children}
		</DocsBody>
	)
}
