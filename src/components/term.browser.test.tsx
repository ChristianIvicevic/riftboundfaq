import { describe, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { Term } from '@/components/term'

describe('Term', () => {
	test('opens its Glossary entry when pressed', async () => {
		const screen = await render(<Term item="finalization">finalized</Term>)
		const trigger = screen.getByRole('button', { name: 'finalized' })
		await expect.element(trigger).toHaveAttribute('data-copy-text', 'finalized')
		await expect.element(trigger).toHaveClass('text-inherit')
		await expect.element(trigger).toHaveClass('decoration-2')
		await expect.element(trigger).toHaveClass('decoration-dotted')
		await expect.element(trigger).toHaveClass('decoration-fd-primary/70')

		await trigger.click()

		const dialog = screen.getByRole('dialog', { name: 'Finalization' })
		await expect
			.element(dialog)
			.toHaveTextContent(
				'Finalization is the setup stage of playing a card or ability: settle its required up-front choices and costs, then check that the play is legal.',
			)
	})

	test('keeps trailing punctuation with the term when wrapping', async () => {
		const screen = await render(
			<p style={{ lineHeight: '28px' }}>
				{'No. Abandoned Hall condition is fulfilled only when that spell finishes '}
				<Term item="resolution">resolving</Term>.
			</p>,
		)
		const paragraph = screen.container.querySelector('p')
		const trigger = paragraph?.querySelector<HTMLElement>('[data-copy-text]')
		const prefix = paragraph?.firstChild
		const period = [...(paragraph?.childNodes ?? [])].find(
			(node) => node.nodeType === Node.TEXT_NODE && node.textContent === '.',
		)
		if (!paragraph || !trigger || !prefix || !period) throw new Error('Wrapping fixture is incomplete')

		paragraph.style.whiteSpace = 'nowrap'
		const prefixRange = document.createRange()
		prefixRange.selectNodeContents(prefix)
		const periodRange = document.createRange()
		periodRange.selectNodeContents(period)
		const availableWidth =
			prefixRange.getBoundingClientRect().width +
			trigger.getBoundingClientRect().width +
			periodRange.getBoundingClientRect().width / 2
		paragraph.style.whiteSpace = 'normal'
		paragraph.style.width = `${availableWidth}px`

		// oxlint-disable-next-line unicorn/prefer-number-coercion
		const lineHeight = Number.parseFloat(getComputedStyle(paragraph).lineHeight)
		const lineDelta = periodRange.getBoundingClientRect().top - trigger.getBoundingClientRect().top
		expect(lineDelta).toBeLessThan(lineHeight / 2)
	})

	test('opens on keyboard focus without moving focus into the popup', async () => {
		const screen = await render(<Term item="cleanup">cleanup</Term>)
		const trigger = screen.getByRole('button', { name: 'cleanup' })

		await userEvent.tab()

		await expect.element(trigger).toHaveFocus()
		await expect.element(screen.getByRole('dialog', { name: 'Cleanup' })).toBeVisible()
	})

	test('opens on hover', async () => {
		const screen = await render(<Term item="pending">pending</Term>)

		await screen.getByRole('button', { name: 'pending' }).hover()

		await expect.element(screen.getByRole('dialog', { name: 'Pending' })).toBeVisible()
	})

	test('closes when Escape is pressed', async () => {
		const screen = await render(<Term item="resolution">resolves</Term>)
		const trigger = screen.getByRole('button', { name: 'resolves' })
		const dialog = screen.getByRole('dialog', { name: 'Resolution' })
		await trigger.click()
		await expect.element(dialog).toBeVisible()

		await userEvent.keyboard('{Escape}')

		await expect.element(dialog).not.toBeInTheDocument()
	})

	test('toggles with repeated presses', async () => {
		const screen = await render(<Term item="chain">chain</Term>)
		const trigger = screen.getByRole('button', { name: 'chain' })
		const dialog = screen.getByRole('dialog', { name: 'Chain' })
		await trigger.click()
		await expect.element(dialog).toBeVisible()

		await trigger.click()

		await expect.element(dialog).not.toBeInTheDocument()
	})

	test('closes when pressed outside', async () => {
		const screen = await render(
			<>
				<div className="h-64">Outside area</div>
				<Term item="focus">focus</Term>
			</>,
		)
		const dialog = screen.getByRole('dialog', { name: 'Focus' })
		await screen.getByRole('button', { name: 'focus' }).click()
		await expect.element(dialog).toBeVisible()

		await screen.getByText('Outside area').click()

		await expect.element(dialog).not.toBeInTheDocument()
	})

	test('closes when keyboard focus leaves the trigger', async () => {
		const screen = await render(
			<>
				<Term item="priority">priority</Term>
				<button type="button">Next control</button>
			</>,
		)
		await userEvent.tab()
		await expect.element(screen.getByRole('dialog', { name: 'Priority' })).toBeVisible()

		await userEvent.tab()

		await expect.element(screen.getByRole('button', { name: 'Next control' })).toHaveFocus()
		await expect.element(screen.getByRole('dialog', { name: 'Priority' })).not.toBeInTheDocument()
	})
})
