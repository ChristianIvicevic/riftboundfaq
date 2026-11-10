import 'tailwindcss/index.css'
import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { CardReference } from '@/components/cards/card-reference'

describe('CardReference', () => {
	test('shows the card image, current text, and Wiki link', async () => {
		const screen = await render(
			<CardReference
				name="Arcane Shift"
				errataHref="/rulings/card-text-updates#arcane-shift"
				reference={{
					currentText: '[Action] Pay [1][Order], [Exhaust]: Give a unit +1 [Might].',
					effectText: null,
					hasErrata: false,
					imageHeight: 1039,
					imageUrl: '/images/rune_order.svg',
					imageWidth: 744,
				}}
			/>,
		)

		await expect.element(screen.getByRole('region', { name: 'Arcane Shift card reference' })).toBeVisible()
		await expect.element(screen.getByRole('img', { name: 'Arcane Shift card' })).toBeVisible()
		await expect.element(screen.getByRole('heading', { name: 'Current text' })).toBeVisible()
		await expect.element(screen.getByText('Action', { exact: true })).toBeVisible()
		await expect.element(screen.getByRole('img', { name: '[Order]' })).toBeVisible()
		const exhaust = screen.getByRole('img', { name: '[Exhaust]' })
		const might = screen.getByRole('img', { name: '[Might]' })
		await expect.element(exhaust).toBeVisible()
		await expect.element(might).toBeVisible()
		expect(getComputedStyle(exhaust.element()).maskImage).toContain('/images/exhaust.svg')
		expect(getComputedStyle(might.element()).maskImage).toContain('/images/might.svg')
		expect(getComputedStyle(might.element()).backgroundColor).toBe(getComputedStyle(might.element()).color)
		await expect
			.element(screen.getByRole('link', { name: 'View on Riftbound Wiki' }))
			.toHaveAttribute('href', 'https://wiki.leagueoflegends.com/en-us/Riftbound:Arcane_Shift')
	})

	test('identifies applied errata and keeps effect text separate', async () => {
		const screen = await render(
			<CardReference
				name="Shady Spectacles"
				errataHref="/rulings/card-text-updates#shady-spectacles"
				reference={{
					currentText: 'Choose another friendly unit.',
					effectText: '(I am a copy of the chosen unit.)',
					hasErrata: true,
					imageHeight: 1039,
					imageUrl: '/images/rune_order.svg',
					imageWidth: 744,
				}}
			/>,
		)

		await expect
			.element(screen.getByRole('link', { name: 'Errata applied' }))
			.toHaveAttribute('href', '/rulings/card-text-updates#shady-spectacles')
		await expect.element(screen.getByText('The card image may show outdated wording.')).toBeVisible()
		await expect.element(screen.getByRole('heading', { name: 'Effect' })).toBeVisible()
		await expect.element(screen.getByText('(I am a copy of the chosen unit.)')).toBeVisible()
	})

	test('keeps a named fallback when the remote card image fails', async () => {
		const screen = await render(
			<CardReference
				name="Arcane Shift"
				errataHref="/rulings/card-text-updates#arcane-shift"
				reference={{
					currentText: 'Deal 2.',
					effectText: null,
					hasErrata: false,
					imageHeight: 1039,
					imageUrl: '/missing-card-image.png',
					imageWidth: 744,
				}}
			/>,
		)
		const image = screen.getByRole('img', { name: 'Arcane Shift card' })

		image.element().dispatchEvent(new Event('error'))

		await expect
			.element(screen.getByRole('img', { name: 'Arcane Shift card image unavailable' }))
			.toBeVisible()
		await expect.element(screen.getByText('Arcane Shift', { exact: true })).toBeVisible()
	})

	test('preserves choice lists and valued card-text tokens', async () => {
		const screen = await render(
			<CardReference
				name="Riven, Broken Blade"
				errataHref="/rulings/card-text-updates#riven-broken-blade"
				reference={{
					currentText: 'Choose one:\n- Pay [Universal].\n- Give a unit [Burn 7].\n- Use [Predict 2].',
					effectText: null,
					hasErrata: false,
					imageHeight: 1039,
					imageUrl: '/images/rune_order.svg',
					imageWidth: 744,
				}}
			/>,
		)

		expect(screen.getByRole('listitem').elements()).toHaveLength(3)
		await expect.element(screen.getByRole('img', { name: '[Universal]' })).toBeVisible()
		await expect.element(screen.getByText('Burn 7', { exact: true })).toBeVisible()
		await expect.element(screen.getByText('[Predict 2]', { exact: true })).toBeVisible()
	})

	test('states when a card has no rules text', async () => {
		const screen = await render(
			<CardReference
				name="Mega-Mech"
				errataHref="/rulings/card-text-updates#mega-mech"
				reference={{
					currentText: null,
					effectText: null,
					hasErrata: false,
					imageHeight: 1039,
					imageUrl: '/images/rune_order.svg',
					imageWidth: 744,
				}}
			/>,
		)

		await expect.element(screen.getByText('This card has no rules text.')).toBeVisible()
	})

	test('copies visual card-text tokens as their bracketed notation', async () => {
		const screen = await render(
			<CardReference
				name="Arcane Shift"
				errataHref="/rulings/card-text-updates#arcane-shift"
				reference={{
					currentText: '[Action] Pay [1][Order].',
					effectText: null,
					hasErrata: false,
					imageHeight: 1039,
					imageUrl: '/images/rune_order.svg',
					imageWidth: 744,
				}}
			/>,
		)
		const paragraph = screen.getByText('Pay', { exact: false }).element()
		const selection = window.getSelection()
		const range = document.createRange()
		range.selectNodeContents(paragraph)
		selection?.removeAllRanges()
		selection?.addRange(range)
		const clipboardData = new DataTransfer()
		const copyEvent = new ClipboardEvent('copy', { bubbles: true })
		Object.defineProperty(copyEvent, 'clipboardData', { value: clipboardData })

		paragraph.dispatchEvent(copyEvent)

		expect(clipboardData.getData('text/plain')).toBe('[Action] Pay [1][Order].')
	})

	test('preserves paragraphs and list markers when copying multiline card text', async () => {
		const screen = await render(
			<CardReference
				name="Riven, Broken Blade"
				errataHref="/rulings/card-text-updates#riven-broken-blade"
				reference={{
					currentText: '[Action] Choose one:\n- Pay [1][Order].\n- Gain +2[Might].\nThen draw 1.',
					effectText: null,
					hasErrata: false,
					imageHeight: 1039,
					imageUrl: '/images/rune_order.svg',
					imageWidth: 744,
				}}
			/>,
		)
		const firstParagraph = screen.getByText('Choose one:', { exact: false }).element()
		const cardText = firstParagraph.parentElement
		if (!cardText) throw new Error('Expected card text container')
		const selection = window.getSelection()
		const range = document.createRange()
		range.selectNodeContents(cardText)
		selection?.removeAllRanges()
		selection?.addRange(range)
		const clipboardData = new DataTransfer()
		const copyEvent = new ClipboardEvent('copy', { bubbles: true })
		Object.defineProperty(copyEvent, 'clipboardData', { value: clipboardData })

		cardText.dispatchEvent(copyEvent)

		expect(clipboardData.getData('text/plain')).toBe(
			'[Action] Choose one:\n\n- Pay [1][Order].\n- Gain +2[Might].\n\nThen draw 1.',
		)
		expect(clipboardData.getData('text/html')).not.toContain('<li>- ')
	})

	test('renders and copies a keyword-associated ability marker as part of its badge', async () => {
		const screen = await render(
			<CardReference
				name="Ruined Rex"
				errataHref="/rulings/card-text-updates#ruined-rex"
				reference={{
					currentText: '[Deathknell][>] Deal 4 to an enemy unit.',
					effectText: null,
					hasErrata: false,
					imageHeight: 1039,
					imageUrl: '/images/rune_order.svg',
					imageWidth: 744,
				}}
			/>,
		)
		const keyword = screen.getByText('Deathknell', { exact: true }).element()
		const paragraph = screen.getByText('Deal 4', { exact: false }).element()
		const selection = window.getSelection()
		const range = document.createRange()

		expect(keyword.dataset.copyText).toBe('[Deathknell][>]')
		expect(keyword.className).toContain('after:[clip-path:polygon')
		expect(paragraph.textContent).not.toContain('[>]')

		range.selectNodeContents(paragraph)
		selection?.removeAllRanges()
		selection?.addRange(range)
		const clipboardData = new DataTransfer()
		const copyEvent = new ClipboardEvent('copy', { bubbles: true })
		Object.defineProperty(copyEvent, 'clipboardData', { value: clipboardData })

		paragraph.dispatchEvent(copyEvent)

		expect(clipboardData.getData('text/plain')).toBe('[Deathknell][>] Deal 4 to an enemy unit.')
	})

	test('italicizes parenthetical reminder text without flattening its tokens', async () => {
		const screen = await render(
			<CardReference
				name="Bone Skewer"
				errataHref="/rulings/card-text-updates#bone-skewer"
				reference={{
					currentText:
						'[Hidden] (Hide now for [Universal] to react with later for [0].)\nChoose a battlefield.',
					effectText: null,
					hasErrata: true,
					imageHeight: 1039,
					imageUrl: '/images/rune_order.svg',
					imageWidth: 744,
				}}
			/>,
		)
		const reminderText = screen.getByText(/Hide now for/u)
		const energy = reminderText.element().querySelector<HTMLElement>('[data-copy-text="[0]"]')
		const cardText = reminderText.element().closest('p')?.parentElement

		expect(reminderText.element().tagName).toBe('EM')
		expect(reminderText.element().querySelector('img[alt="[Universal]"]')).not.toBeNull()
		expect(energy).not.toBeNull()
		expect(cardText).not.toBeNull()
		expect(getComputedStyle(cardText!).fontSize).toBe('15px')
		expect(getComputedStyle(cardText!).lineHeight).toBe('24px')
		expect(getComputedStyle(cardText!).rowGap).toBe('6px')
		expect(getComputedStyle(energy!).fontStyle).toBe('normal')
		await expect.element(screen.getByText('Choose a battlefield.')).toBeVisible()
	})
})
