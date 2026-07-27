'use client'

import { DocsBody } from 'fumadocs-ui/layouts/docs/page'
import type { ClipboardEvent, ComponentProps } from 'react'

function handleCopy(event: ClipboardEvent<HTMLElement>) {
	const selection = window.getSelection()

	if (!selection || selection.isCollapsed || selection.rangeCount === 0) return

	const fragment = selection.getRangeAt(0).cloneContents()
	const replacements = fragment.querySelectorAll<HTMLElement>('[data-copy-text]')

	if (replacements.length === 0) return

	for (const element of replacements) {
		element.replaceWith(element.dataset.copyText ?? element.textContent ?? '')
	}

	const container = document.createElement('div')
	container.append(fragment)

	event.clipboardData.setData('text/plain', container.textContent ?? '')
	event.clipboardData.setData('text/html', container.innerHTML)
	event.preventDefault()
}

export function CopyableDocsBody({ children, ...props }: ComponentProps<typeof DocsBody>) {
	return (
		<DocsBody {...props} onCopy={handleCopy}>
			{children}
		</DocsBody>
	)
}
