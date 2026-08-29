import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { CardPreviewLink } from '@/components/cards/card-preview-link'

describe('CardPreviewLink', () => {
	test('keeps a multiword card name and trailing punctuation together when wrapping', async () => {
		const screen = await render(
			<>
				<style>{'.whitespace-nowrap { white-space: nowrap; }'}</style>
				<p style={{ lineHeight: '28px' }}>
					{'If an effect refers to '}
					<CardPreviewLink
						galleryUrl="https://example.com/gallery"
						imageUrl="https://example.com/card.webp"
						name="Fizz, Trickster"
						wikiUrl="https://example.com/wiki"
					>
						Fizz, Trickster
					</CardPreviewLink>
					,
				</p>
			</>,
		)
		const paragraph = screen.container.querySelector('p')
		const trigger = paragraph?.querySelector<HTMLElement>('[aria-label="Preview Fizz, Trickster"]')
		const prefix = paragraph?.firstChild
		const punctuation = [...(paragraph?.childNodes ?? [])].find(
			(node) => node.nodeType === Node.TEXT_NODE && node.textContent === ',',
		)
		if (!paragraph || !trigger || !prefix || !punctuation) throw new Error('Wrapping fixture is incomplete')

		paragraph.style.whiteSpace = 'nowrap'
		const prefixRange = document.createRange()
		prefixRange.selectNodeContents(prefix)
		const punctuationRange = document.createRange()
		punctuationRange.selectNodeContents(punctuation)
		const availableWidth =
			prefixRange.getBoundingClientRect().width +
			trigger.getBoundingClientRect().width +
			punctuationRange.getBoundingClientRect().width / 2
		paragraph.style.whiteSpace = 'normal'
		paragraph.style.width = `${availableWidth}px`

		const triggerRange = document.createRange()
		triggerRange.selectNodeContents(trigger)
		const triggerRects = [...triggerRange.getClientRects()]
		expect(triggerRects).toHaveLength(1)
		expect(punctuationRange.getBoundingClientRect().top).toBe(triggerRects[0]?.top)
	})

	test('opens the card preview with keyboard activation', async () => {
		const screen = await render(
			<CardPreviewLink
				galleryUrl="https://example.com/gallery"
				imageUrl="https://example.com/card.webp"
				name="Fizz, Trickster"
				wikiUrl="https://example.com/wiki"
			>
				Fizz, Trickster
			</CardPreviewLink>,
		)
		const trigger = screen.getByRole('button', { name: 'Preview Fizz, Trickster' })

		await userEvent.tab()
		await expect.element(trigger).toHaveFocus()
		await userEvent.keyboard('{Enter}')

		await expect.element(screen.getByRole('dialog', { name: 'Fizz, Trickster card preview' })).toBeVisible()
	})
})
