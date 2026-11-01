'use client'

import type { ClipboardEvent, ReactNode } from 'react'

function prependListMarkers(container: HTMLElement) {
	for (const item of container.querySelectorAll('li')) {
		const list = item.parentElement
		if (list instanceof HTMLUListElement) {
			item.prepend('- ')
			continue
		}
		if (!(list instanceof HTMLOListElement)) continue

		const index = [...list.children].indexOf(item)
		const start = list.hasAttribute('start') ? list.start : list.reversed ? list.children.length : 1
		const value = item.hasAttribute('value') ? item.value : start + (list.reversed ? -index : index)
		item.prepend(`${value}. `)
	}
}

function getRenderedPlainText(container: HTMLElement) {
	prependListMarkers(container)
	container.setAttribute('aria-hidden', 'true')
	container.style.position = 'fixed'
	container.style.top = '0'
	container.style.left = '-10000px'
	container.style.pointerEvents = 'none'
	// innerText preserves block boundaries only while the clone participates in layout.
	document.body.append(container)

	try {
		return container.innerText
	} finally {
		container.remove()
	}
}

export function handleCopy(event: ClipboardEvent<HTMLElement>) {
	const selection = window.getSelection()

	if (!selection || selection.isCollapsed || selection.rangeCount === 0) return

	const fragment = selection.getRangeAt(0).cloneContents()
	// Open popovers inject visually hidden focus-management nodes into selected prose.
	for (const element of fragment.querySelectorAll('[aria-hidden="true"], [aria-owns]:empty')) {
		element.remove()
	}
	const replacements = fragment.querySelectorAll<HTMLElement>('[data-copy-text]')

	if (replacements.length === 0) return

	for (const element of replacements) {
		element.replaceWith(element.dataset.copyText ?? element.textContent ?? '')
	}

	const container = document.createElement('div')
	container.append(fragment)
	const html = container.innerHTML

	event.clipboardData.setData('text/plain', getRenderedPlainText(container))
	event.clipboardData.setData('text/html', html)
	event.preventDefault()
}

export function CopyableContent({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div className={className} onCopy={handleCopy}>
			{children}
		</div>
	)
}
